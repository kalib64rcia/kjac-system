"""Booking lifecycle: create, track, cancel, reschedule, dispatch, expiry.

Tier logic locked in CONTRACTS.md (C5–C8, U1, U3/U4, R1). Technician progress
markers live in booking_status_history notes (technician:on_way|arrived|
ongoing|completed) so booking.status keeps its appointment meaning.
"""

import re
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.bookings import Booking, BookingStatusHistory, RescheduleRequest
from app.models.catalog import AirconBrand, Service
from app.models.financial import Payment, Refund
from app.models.psgc import PsgcBarangay, PsgcCityMunicipality
from app.models.users import User
from app.services.notify_service import notify
from app.services.user_service import UserService
from app.utils.reference_id import generate_reference_id
from app.utils.time_rules import MANILA_TZ

TECH_MARKERS = ("on_the_way", "arrived", "ongoing", "completed")
TERMINAL_STATUSES = ("completed", "cancelled", "expired")
SLOT_START = time(8, 0)
SLOT_END = time(16, 0)


def manila_now() -> datetime:
    return datetime.now(MANILA_TZ)


def mask_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    if len(digits) <= 4:
        return "***"
    return f"{raw[:4]}***{digits[-4:]}"


async def _setting(db: AsyncSession, key: str, default: str) -> str:
    from app.models.system import SystemSetting

    result = await db.execute(
        select(SystemSetting.setting_value).where(SystemSetting.setting_key == key)
    )
    return result.scalar_one_or_none() or default


async def calc_down_payment(db: AsyncSession, service_id: int) -> tuple[Service, float, float]:
    """Return (service, down_payment, total). Raises BOOKING_005 if unknown/inactive."""
    service = await db.get(Service, service_id)
    if service is None or not service.is_active or service.deleted_at is not None:
        raise AppError("BOOKING_005", "Unknown or inactive service.", 400)
    base = float(service.base_price)
    if service.down_payment_type == "percentage":
        down = round(base * float(service.down_payment_amount) / 100, 2)
    else:
        down = float(service.down_payment_amount)
    return service, down, base


async def validate_slot(db: AsyncSession, day: date, slot: time) -> None:
    """Enforce C5: future, +30d max, Sunday setting, same-day 12PM cutoff, 8–4."""
    now = manila_now()
    today = now.date()
    if day < today:
        raise AppError("VAL_002", "Preferred date must not be in the past.", 422)
    if day > today + timedelta(days=30):
        raise AppError("VAL_002", "Cannot book more than 30 days ahead.", 422)
    if slot < SLOT_START or slot > SLOT_END:
        raise AppError("VAL_002", "Booking time must be between 8:00 AM and 4:00 PM.", 422)
    preferred = datetime.combine(day, slot).replace(tzinfo=MANILA_TZ)
    if preferred <= now:
        raise AppError("VAL_002", "Preferred time must be in the future.", 422)
    if day.weekday() == 6:  # Sunday
        allow = (await _setting(db, "allow_sunday_bookings", "false")).lower() == "true"
        if not allow:
            raise AppError("VAL_002", "Sunday bookings are not available.", 422)
    if day == today and now.time() >= time(12, 0):
        raise AppError("VAL_002", "Same-day cutoff passed (12:00 PM).", 422)


async def check_create_rate_limit(
    db: AsyncSession, user: User | None, email: str
) -> None:
    window = manila_now().astimezone(UTC) - timedelta(
        minutes=settings.booking_rate_limit_minutes
    )
    query = select(func.count(Booking.id)).where(Booking.created_at >= window)
    if user is not None:
        query = query.where(Booking.customer_id == user.id)
    else:
        query = query.where(func.lower(Booking.customer_email) == email.lower())
    count = (await db.execute(query)).scalar_one()
    if count >= settings.booking_rate_limit_count:
        raise AppError(
            "BOOKING_004",
            f"Maximum {settings.booking_rate_limit_count} bookings per "
            f"{settings.booking_rate_limit_minutes} minutes.",
            429,
        )


async def _get_brand(db: AsyncSession, brand_id: int) -> AirconBrand:
    brand = await db.get(AirconBrand, brand_id)
    if brand is None or not brand.is_active or brand.deleted_at is not None:
        raise AppError("BOOKING_005", "Unknown or inactive brand.", 400)
    return brand


async def _notify_admins(
    db: AsyncSession, type: str, title: str, message: str, booking_id: int | None = None
) -> None:
    result = await db.execute(
        select(User.id).where(User.role == "admin", User.deleted_at.is_(None))
    )
    for (admin_id,) in result.all():
        await notify(db, admin_id, type, title, message, booking_id)


async def _notify_customer(booking: Booking, type: str, title: str, message: str,
                           db: AsyncSession) -> None:
    if booking.customer_id is not None:  # guests get email only (Phase 4)
        await notify(db, booking.customer_id, type, title, message, booking.id)


async def get_booking_or_404(db: AsyncSession, booking_id: int) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.deleted_at is not None:
        raise AppError("BOOKING_001", "Booking not found.", 404)
    return booking


def assert_owner(booking: Booking, user: User | None, guest_email: str | None) -> None:
    """Owner check: authed owner, or guest email match. Else 404 (no enumeration)."""
    if user is not None:
        if booking.customer_id == user.id:
            return
        raise AppError("BOOKING_001", "Booking not found.", 404)
    if guest_email and booking.customer_email.lower() == guest_email.lower():
        return
    raise AppError("BOOKING_001", "Booking not found.", 404)


async def create_booking(
    db: AsyncSession,
    *,
    user: User | None,
    first_name: str,
    last_name: str,
    email: str,
    phone: str,
    region_code: str,
    province_code: str,
    city_municipality_code: str,
    barangay_code: str,
    street_address: str,
    landmark: str,
    service_id: int,
    brand_id: int,
    preferred_date: date,
    preferred_time: time,
    problem_description: str | None,
) -> Booking:
    await validate_slot(db, preferred_date, preferred_time)
    await _get_brand(db, brand_id)
    service, down, total = await calc_down_payment(db, service_id)
    await check_create_rate_limit(db, user, email)
    if user is not None and not UserService.is_profile_complete(user):
        raise AppError(
            "PROFILE_INCOMPLETE",
            "Complete your profile address before booking.", 422,
        )

    booking = Booking(
        reference_id=generate_reference_id(),
        customer_id=user.id if user is not None else None,
        service_id=service.id,
        brand_id=brand_id,
        customer_first_name=first_name,
        customer_last_name=last_name,
        customer_email=email,
        customer_phone=phone,
        region_code=region_code,
        province_code=province_code,
        city_municipality_code=city_municipality_code,
        barangay_code=barangay_code,
        street_address=street_address,
        landmark=landmark,
        preferred_date=preferred_date,
        preferred_time=preferred_time,
        problem_description=problem_description,
        down_payment_amount=down,
        total_service_cost=total,
        status="submitted",
    )
    db.add(booking)
    await db.flush()  # expiry trigger fills expires_at on INSERT
    if booking.expires_at is None:
        # Fallback if the trigger is absent/disabled; same rule, explicit.
        try:
            hours = int(await _setting(db, "booking_expiration_hours", "3"))
        except ValueError:
            hours = 3
        booking.expires_at = datetime.now(UTC) + timedelta(hours=max(hours, 1))
        await db.flush()
    await db.refresh(booking)
    await _notify_admins(
        db, "booking_submitted", "New booking submitted",
        f"{booking.reference_id} — {service.name}", booking.id,
    )
    await db.commit()
    await db.refresh(booking)
    return booking


async def _area_names(db: AsyncSession, booking: Booking) -> tuple[str | None, str | None]:
    barangay = city = None
    if booking.barangay_code:
        result = await db.execute(
            select(PsgcBarangay.barangay_name).where(
                PsgcBarangay.barangay_code == booking.barangay_code
            )
        )
        barangay = result.scalar_one_or_none()
    if booking.city_municipality_code:
        result = await db.execute(
            select(PsgcCityMunicipality.city_municipality_name).where(
                PsgcCityMunicipality.city_municipality_code == booking.city_municipality_code
            )
        )
        city = result.scalar_one_or_none()
    return barangay, city


async def _timeline(db: AsyncSession, booking_id: int) -> list[dict]:
    result = await db.execute(
        select(BookingStatusHistory)
        .where(BookingStatusHistory.booking_id == booking_id)
        .order_by(BookingStatusHistory.id)
    )
    return [
        {
            "from": row.old_status,
            "to": row.new_status,
            "at": row.created_at.isoformat() if row.created_at else None,
            "note": row.notes,
        }
        for row in result.scalars()
    ]


async def track_booking(db: AsyncSession, reference_id: str, email: str) -> dict:
    """Public tracking: reference + email must match (R1); PII masked."""
    result = await db.execute(
        select(Booking).where(
            func.lower(Booking.reference_id) == reference_id.strip().lower(),
            Booking.deleted_at.is_(None),
        )
    )
    booking = result.scalar_one_or_none()
    if booking is None or booking.customer_email.lower() != email.strip().lower():
        raise AppError("BOOKING_001", "Booking not found.", 404)
    barangay, city = await _area_names(db, booking)
    tech_name = tech_rating = None
    if booking.technician_id is not None:
        tech = await db.get(User, booking.technician_id)
        if tech is not None:
            tech_name = f"{tech.first_name} {tech.last_name}"
            tech_rating = float(tech.average_rating or 0)
    return {
        "reference_id": booking.reference_id,
        "status": booking.status,
        "customer_name": f"{booking.customer_first_name} {booking.customer_last_name}",
        "service_id": booking.service_id,
        "brand_id": booking.brand_id,
        "preferred_date": booking.preferred_date,
        "preferred_time": booking.preferred_time,
        "area_barangay": barangay,
        "area_city": city,
        "masked_phone": mask_phone(booking.customer_phone),
        "technician_name": tech_name,
        "technician_rating": tech_rating,
        "down_payment_amount": float(booking.down_payment_amount),
        "expires_at": booking.expires_at.isoformat() if booking.expires_at else None,
        "timeline": await _timeline(db, booking.id),
    }


async def _latest_payment(db: AsyncSession, booking_id: int) -> Payment | None:
    result = await db.execute(
        select(Payment)
        .where(Payment.booking_id == booking_id)
        .order_by(Payment.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _is_dispatched(db: AsyncSession, booking_id: int) -> bool:
    """Any technician progress marker means the tech rolled (CANCEL-003)."""
    result = await db.execute(
        select(func.count(BookingStatusHistory.id)).where(
            BookingStatusHistory.booking_id == booking_id,
            BookingStatusHistory.notes.like("technician:%"),
        )
    )
    return result.scalar_one() > 0


async def cancel_booking(
    db: AsyncSession, booking: Booking, user: User | None, reason: str
) -> dict:
    if booking.status in TERMINAL_STATUSES:
        raise AppError("BOOKING_003", f"Cannot cancel a {booking.status} booking.", 409)

    now = manila_now()
    preferred_day = booking.preferred_date
    dispatched = await _is_dispatched(db, booking.id) or booking.status == "ongoing"
    payment = await _latest_payment(db, booking.id)
    paid = payment is not None

    if booking.status in ("submitted", "pending"):
        tier = "immediate"
    elif not dispatched and preferred_day > now.date():
        tier = "advance"
    elif not dispatched:
        tier = "same_day"
    else:
        tier = "late"

    booking.status = "cancelled"
    booking.cancellation_reason = reason
    booking.cancelled_by_user_id = user.id if user is not None else None

    refund_status, refund_amount = "none", 0.0
    # Guests have no user row: requested_by stays NULL, admin refunds by
    # reference number (migration 0a000010).
    actor_id = (
        user.id
        if user is not None
        else (payment.customer_id if payment is not None else None)
        or booking.customer_id
    )
    if paid and payment is not None:
        if tier in ("immediate", "advance"):
            db.add(
                Refund(
                    booking_id=booking.id, payment_id=payment.id,
                    requested_by_user_id=actor_id,
                    refund_amount=payment.amount, refund_type="full",
                    reason=reason, status="approved",
                )
            )
            refund_status, refund_amount = "approved", float(payment.amount)
        elif tier == "same_day":
            db.add(
                Refund(
                    booking_id=booking.id, payment_id=payment.id,
                    requested_by_user_id=actor_id,
                    refund_amount=payment.amount, refund_type="full",
                    reason=reason, status="processing",
                )
            )
            refund_status, refund_amount = "processing", float(payment.amount)
        else:
            db.add(
                Refund(
                    booking_id=booking.id, payment_id=payment.id,
                    requested_by_user_id=actor_id,
                    refund_amount=0, refund_type="none",
                    reason=reason, status="denied", denial_reason="Late cancellation",
                )
            )
            refund_status, refund_amount = "denied", 0.0

    await _notify_customer(
        booking, "booking_cancelled", "Booking cancelled",
        f"{booking.reference_id} cancelled ({tier}).", db,
    )
    await _notify_admins(
        db, "booking_cancelled", "Booking cancelled",
        f"{booking.reference_id} cancelled ({tier}): {reason}", booking.id,
    )
    await db.commit()
    return {
        "booking_id": booking.id, "status": "cancelled",
        "refund_status": refund_status, "refund_amount": refund_amount,
    }


async def _tech_markers(db: AsyncSession, booking_id: int) -> list[str]:
    result = await db.execute(
        select(BookingStatusHistory.notes)
        .where(
            BookingStatusHistory.booking_id == booking_id,
            BookingStatusHistory.notes.like("technician:%"),
        )
        .order_by(BookingStatusHistory.id)
    )
    return [note.split(":", 1)[1] for (note,) in result.all() if note]


async def request_reschedule(
    db: AsyncSession,
    booking: Booking,
    user: User | None,
    new_date: date,
    new_time: time,
    reason: str,
) -> RescheduleRequest:
    """Confirmed-only, ≥24h notice, max 2 requests per booking (CONTRACTS U4)."""
    if booking.status != "confirmed":
        raise AppError("BOOKING_003", "Only confirmed bookings can be rescheduled.", 409)
    await validate_slot(db, new_date, new_time)
    current_start = datetime.combine(
        booking.preferred_date, booking.preferred_time
    ).replace(tzinfo=MANILA_TZ)
    if current_start - manila_now() < timedelta(hours=24):
        raise AppError("VAL_002", "Reschedule needs at least 24h notice.", 422)
    result = await db.execute(
        select(func.count(RescheduleRequest.id)).where(
            RescheduleRequest.booking_id == booking.id
        )
    )
    if result.scalar_one() >= 2:
        raise AppError("BOOKING_003", "Maximum 2 reschedules per booking.", 409)

    row = RescheduleRequest(
        booking_id=booking.id,
        requested_by_user_id=user.id if user is not None else None,
        old_preferred_date=booking.preferred_date,
        old_preferred_time=booking.preferred_time,
        new_preferred_date=new_date,
        new_preferred_time=new_time,
        reason=reason,
        status="pending",
    )
    db.add(row)
    await db.flush()
    await _notify_admins(
        db, "reschedule_approved", "Reschedule requested",
        f"{booking.reference_id} → {new_date} {new_time}: {reason}", booking.id,
    )
    await db.commit()
    await db.refresh(row)
    return row


async def review_reschedule(
    db: AsyncSession, request_id: int, admin: User, approve: bool,
    admin_notes: str | None,
) -> RescheduleRequest:
    row = await db.get(RescheduleRequest, request_id)
    if row is None:
        raise AppError("BOOKING_001", "Reschedule request not found.", 404)
    if row.status != "pending":
        raise AppError("BOOKING_003", "Request already reviewed.", 409)
    booking = await get_booking_or_404(db, row.booking_id)
    if approve:
        await validate_slot(db, row.new_preferred_date, row.new_preferred_time)
        booking.preferred_date = row.new_preferred_date
        booking.preferred_time = row.new_preferred_time
        row.status = "approved"
        note, ntype = "approved for new slot", "reschedule_approved"
    else:
        row.status = "denied"
        note, ntype = "denied, original slot kept", "reschedule_denied"
    row.reviewed_by_user_id = admin.id
    row.admin_notes = admin_notes
    row.reviewed_at = datetime.now(UTC)
    await _notify_customer(
        booking, ntype, f"Reschedule {row.status}",
        f"{booking.reference_id} reschedule {note}.", db,
    )
    await db.commit()
    await db.refresh(row)
    return row


async def assign_technician(
    db: AsyncSession, booking: Booking, technician_id: int
) -> Booking:
    """Assign with max-3-appointments-per-day guard (BR-005)."""
    tech = await db.get(User, technician_id)
    if tech is None or tech.deleted_at is not None:
        raise AppError("BOOKING_005", "Technician not found.", 404)
    if tech.role != "technician" or tech.status != "active":
        raise AppError("BOOKING_005", "User is not an available technician.", 400)
    if booking.status in TERMINAL_STATUSES:
        raise AppError("BOOKING_003", "Cannot assign to a closed booking.", 409)
    result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.technician_id == technician_id,
            Booking.preferred_date == booking.preferred_date,
            Booking.status.in_(("confirmed", "ongoing")),
            Booking.deleted_at.is_(None),
            Booking.id != booking.id,
        )
    )
    if result.scalar_one() >= 3:
        raise AppError("BOOKING_006", "Technician is fully booked that day.", 409)
    booking.technician_id = technician_id
    await notify(
        db, technician_id, "technician_assigned", "New job assigned",
        f"{booking.reference_id} on {booking.preferred_date}", booking.id,
    )
    await _notify_customer(
        booking, "technician_assigned", "Technician assigned",
        f"{tech.first_name} {tech.last_name} will service {booking.reference_id}.", db,
    )
    await db.commit()
    await db.refresh(booking)
    return booking


async def tech_update_status(
    db: AsyncSession, booking: Booking, marker: str, actor: User
) -> Booking:
    """Strict progression: confirmed→on_way→arrived→ongoing→completed.

    on_way/arrived keep booking.status (appointment meaning per C5 fix);
    ongoing/completed move it. Markers are history notes for dispatch checks.
    """
    if booking.status in ("cancelled", "expired", "completed"):
        raise AppError("BOOKING_003", f"Cannot update a {booking.status} booking.", 409)
    if actor.role != "admin" and booking.technician_id != actor.id:
        raise AppError("PERM_001", "Only the assigned technician can update this job.", 403)

    markers = await _tech_markers(db, booking.id)
    last = markers[-1] if markers else None
    if booking.status == "ongoing":
        expected: str | None = "completed"
    elif booking.status == "confirmed":
        expected = {"__none__": "on_the_way", "on_the_way": "arrived",
                    "arrived": "ongoing"}.get(last or "__none__")
    else:
        raise AppError("BOOKING_003", "Job is not confirmed yet.", 409)
    if marker != expected:
        raise AppError(
            "BOOKING_003",
            f"Invalid transition. Expected '{expected}'.", 409,
        )

    old_status = booking.status
    if marker == "ongoing":
        booking.status = "ongoing"
    elif marker == "completed":
        booking.status = "completed"
    db.add(
        BookingStatusHistory(
            booking_id=booking.id,
            changed_by_user_id=actor.id,
            old_status=old_status,
            new_status=booking.status,
            notes=f"technician:{marker}",
        )
    )
    titles = {
        "on_the_way": ("technician_on_way", "Technician on the way"),
        "arrived": ("technician_arrived", "Technician arrived"),
        "ongoing": ("service_started", "Service started"),
        "completed": ("service_completed", "Service completed"),
    }
    ntype, title = titles[marker]
    await _notify_customer(
        booking, ntype, title, f"{booking.reference_id}: {title.lower()}.", db
    )
    await db.commit()
    await db.refresh(booking)
    return booking


async def expire_due_bookings(db: AsyncSession) -> int:
    """Flip submitted bookings past expires_at to expired. Returns count."""
    result = await db.execute(
        Booking.__table__.update()
        .where(
            Booking.status == "submitted",
            Booking.expires_at.is_not(None),
            Booking.expires_at < datetime.now(UTC),
        )
        .values(status="expired")
    )
    await db.commit()
    return result.rowcount or 0
