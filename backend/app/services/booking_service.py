"""Booking lifecycle: create, track, cancel, reschedule, dispatch, expiry.

Tier logic locked in CONTRACTS.md (C5–C8, U1, U3/U4, R1). Technician progress
markers live in booking_status_history notes (technician:on_way|arrived|
ongoing|completed) so booking.status keeps its appointment meaning.
"""

import hashlib
import logging
import re
import secrets
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import asc, delete, desc, func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.bookings import (
    Booking,
    BookingHold,
    BookingStatusHistory,
    BookingWaitlist,
    RescheduleRequest,
    TechnicianTimeOff,
    TechnicianWorkday,
)
from app.models.catalog import AirconBrand, Service
from app.models.financial import Payment, Refund
from app.models.psgc import (
    PsgcBarangay,
    PsgcCityMunicipality,
    PsgcProvince,
    PsgcRegion,
)
from app.models.users import User
from app.services.notify_service import notify
from app.services.user_service import UserService
from app.utils.reference_id import generate_reference_id
from app.utils.time_rules import MANILA_TZ

TERMINAL_STATUSES = ("completed", "cancelled", "expired")
SLOT_START = time(8, 0)
SLOT_END = time(16, 0)

logger = logging.getLogger(__name__)


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
    allow = True
    if day.weekday() == 6:  # Sunday
        allow = (await _setting(db, "allow_sunday_bookings", "false")).lower() == "true"
    reason = _slot_closed(day, slot, now, allow)
    if reason is not None:
        raise AppError("VAL_002", reason, 422)


SLOT_TIMES: tuple[time, ...] = tuple(time(h, 0) for h in range(8, 17))

#: Bookings in these states occupy a seat (cancelled/expired/completed/
#: rescheduled rows keep history but free the slot).
OCCUPYING_STATUSES = ("submitted", "pending", "confirmed", "scheduled", "assigned", "ongoing")

#: Hybrid windows: anchor hour guests see + slots a window booking counts
#: against (conservative: a flexible morning occupies every morning slot
#: until dispatch places the exact hour).
WINDOWS: dict[str, tuple[time, tuple[str, ...]]] = {
    "morning": (time(8, 0), ("08:00", "09:00", "10:00", "11:00")),
    "afternoon": (time(12, 0), ("12:00", "13:00", "14:00", "15:00", "16:00")),
}


def _slot_closed(day: date, slot: time, now: datetime, allow_sunday: bool) -> str | None:
    """Rule reason a slot is unbookable (None = house rules pass). Same C5
    messages as validate_slot, shared so display and submit never disagree."""
    today = now.date()
    if day < today:
        return "Preferred date must not be in the past."
    if day > today + timedelta(days=30):
        return "Cannot book more than 30 days ahead."
    if slot < SLOT_START or slot > SLOT_END:
        return "Booking time must be between 8:00 AM and 4:00 PM."
    preferred = datetime.combine(day, slot).replace(tzinfo=MANILA_TZ)
    if preferred <= now:
        return "Preferred time must be in the future."
    if day.weekday() == 6 and not allow_sunday:  # Sunday
        return "Sunday bookings are not available."
    if day == today and now.time() >= time(12, 0):
        return "Same-day cutoff passed (12:00 PM)."
    return None


async def _lock_slot(db: AsyncSession, day: date, slot: time) -> None:
    """Serialize same-slot writes: the last seat can't be double-sold."""
    key = f"{day.isoformat()}|{slot.strftime('%H:%M')}"
    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": key}
    )


async def _active_technician_count(db: AsyncSession, day: date | None = None) -> int:
    """Active techs, optionally on shift a given day (roster template
    minus leave). No day = legacy headcount (single-slot callers pass
    their day; only backfills omit it)."""
    query = select(func.count(User.id)).where(
        User.role == "technician", User.status == "active",
        User.deleted_at.is_(None),
    )
    if day is not None:
        weekday = day.weekday()
        query = query.where(
            ~select(TechnicianWorkday.id)
            .where(
                TechnicianWorkday.user_id == User.id,
                TechnicianWorkday.weekday == weekday,
                TechnicianWorkday.is_working.is_(False),
            )
            .exists(),
            ~select(TechnicianTimeOff.id)
            .where(
                TechnicianTimeOff.user_id == User.id,
                TechnicianTimeOff.date_from <= day,
                TechnicianTimeOff.date_to >= day,
            )
            .exists(),
        )
    result = await db.execute(query)
    return int(result.scalar_one())


async def _capacity_by_day(
    db: AsyncSession, start: date, end: date
) -> dict[date, int]:
    """Batched per-day headcount for ranges: one tech list + roster reads,
    Python-side math. No roster rows = legacy headcount every day."""
    techs = (
        await db.execute(
            select(User.id).where(
                User.role == "technician", User.status == "active",
                User.deleted_at.is_(None),
            )
        )
    ).scalars().all()
    if not techs:
        return {}
    off = set(
        (
            await db.execute(
                select(TechnicianWorkday.user_id, TechnicianWorkday.weekday).where(
                    TechnicianWorkday.user_id.in_(techs),
                    TechnicianWorkday.is_working.is_(False),
                )
            )
        ).all()
    )
    leave = (
        await db.execute(
            select(
                TechnicianTimeOff.user_id,
                TechnicianTimeOff.date_from,
                TechnicianTimeOff.date_to,
            ).where(
                TechnicianTimeOff.user_id.in_(techs),
                TechnicianTimeOff.date_to >= start,
                TechnicianTimeOff.date_from <= end,
            )
        )
    ).all()
    out: dict[date, int] = {}
    day = start
    while day <= end:
        weekday = day.weekday()
        out[day] = sum(
            1 for uid in techs
            if (uid, weekday) not in off
            and not any(
                u == uid and dfrom <= day <= dto
                for u, dfrom, dto in leave
            )
        )
        day += timedelta(days=1)
    return out


async def _slot_numbers(db: AsyncSession) -> tuple[int, int, int]:
    """(house_reserve, low_threshold, hold_minutes), code defaults win on junk."""

    def _int(raw: str, default: int) -> int:
        try:
            return max(0, int(raw))
        except ValueError:
            return default

    reserve = _int(await _setting(db, "slot_house_reserve", "1"), 1)
    low = _int(await _setting(db, "slot_low_threshold", "2"), 2)
    hold_min = _int(await _setting(db, "slot_hold_minutes", "10"), 10)
    return reserve, low, max(1, hold_min)


def _public_seats_left(*, capacity: int, booked: int, holds: int, reserve: int) -> int:
    # Reserve never closes the last seat: a one-tech shop stays bookable
    # (there is nothing to hide at capacity 1 anyway). Set reserve 0 to off.
    reserve = min(reserve, max(0, capacity - 1))
    return max(0, capacity - booked - holds - reserve)


async def _service_duration_minutes(db: AsyncSession, booking: Booking) -> int | None:
    """Service duration without touching the lazy `booking.service`
    relationship (raises AttributeError on detached/expired rows)."""
    if booking.service_id is None:
        return None
    svc = await db.get(Service, booking.service_id)
    return svc.estimated_duration_minutes if svc else None


async def _has_time_overlap(
    db: AsyncSession, 
    booking_date: date, 
    start_time: time, 
    duration_minutes: int,
    exclude_booking_id: int | None = None
) -> bool:
    """Check if any booking overlaps with the given time range.
    
    Returns True if there's a conflict with existing assigned/ongoing bookings.
    """
    from datetime import datetime, timedelta
    
    # Calculate end time
    start_dt = datetime.combine(booking_date, start_time)
    end_dt = start_dt + timedelta(minutes=duration_minutes)
    end_time = end_dt.time()
    
    # Query for overlapping bookings
    query = select(Booking.id).where(
        Booking.preferred_date == booking_date,
        Booking.status.in_(("assigned", "ongoing")),
        Booking.deleted_at.is_(None),
    )
    
    if exclude_booking_id:
        query = query.where(Booking.id != exclude_booking_id)
    
    result = await db.execute(query)
    existing_bookings = result.scalars().all()
    
    # Check each existing booking for time overlap
    for booking_id in existing_bookings:
        booking = await db.get(Booking, booking_id)
        if not booking or not booking.preferred_time:
            continue
            
        # Get existing booking's time range
        existing_start = booking.preferred_time
        existing_duration = booking.estimated_duration_minutes or await _service_duration_minutes(db, booking) or 60
        existing_start_dt = datetime.combine(booking_date, existing_start)
        existing_end_dt = existing_start_dt + timedelta(minutes=existing_duration)
        existing_end_time = existing_end_dt.time()
        
        # Check for overlap: [start1, end1) overlaps [start2, end2) if start1 < end2 AND start2 < end1
        if start_time < existing_end_time and existing_start < end_time:
            return True
    
    return False


async def _occupied_counts(
    db: AsyncSession, start: date, end: date
) -> dict[tuple[str, str], int]:
    """Booked seats per (date, time): one GROUP BY, no per-row queries."""
    result = await db.execute(
        select(
            Booking.preferred_date, Booking.preferred_time,
            func.count(Booking.id),
        ).where(
            Booking.preferred_date >= start, Booking.preferred_date <= end,
            Booking.status.in_(OCCUPYING_STATUSES),
            Booking.deleted_at.is_(None),
        ).group_by(
            Booking.preferred_date, Booking.preferred_time
        )
    )
    out: dict[tuple[str, str], int] = {}
    for day, slot, count in result.all():
        day_key = str(day)
        key = (day_key, slot.strftime("%H:%M"))
        out[key] = out.get(key, 0) + int(count)
    return out


async def _live_hold_counts(
    db: AsyncSession, start: date, end: date, now: datetime
) -> dict[tuple[str, str], int]:
    result = await db.execute(
        select(
            BookingHold.preferred_date, BookingHold.preferred_time,
            func.count(BookingHold.id),
        ).where(
            BookingHold.preferred_date >= start, BookingHold.preferred_date <= end,
            BookingHold.consumed_at.is_(None), BookingHold.expires_at > now,
        ).group_by(BookingHold.preferred_date, BookingHold.preferred_time)
    )
    out: dict[tuple[str, str], int] = {}
    for day, slot, count in result.all():
        out[(str(day), slot.strftime("%H:%M"))] = int(count)
    return out


async def slot_availability(db: AsyncSession, day: date, slot: time) -> int:
    """Public seats left for one slot. THE SEAM for Phase D: keep this
    signature; richer capacity (roster, travel) swaps in inside while every
    caller (endpoint, guard, holds) stays untouched.
    # ponytail: single-slot path does a few small queries; the range
    # endpoint below batches instead — don't loop this per slot.
    """
    now = manila_now()
    allow = True
    if day.weekday() == 6:
        allow = (await _setting(db, "allow_sunday_bookings", "false")).lower() == "true"
    if _slot_closed(day, slot, now, allow) is not None:
        return 0
    reserve, _, _ = await _slot_numbers(db)
    capacity = await _active_technician_count(db, day)
    booked = await _occupied_counts(db, day, day)
    holds = await _live_hold_counts(db, day, day, now)
    key = (day.isoformat(), slot.strftime("%H:%M"))
    return _public_seats_left(
        capacity=capacity, booked=booked.get(key, 0),
        holds=holds.get(key, 0), reserve=reserve,
    )


async def availability_range(
    db: AsyncSession, start: date, end: date
) -> list[dict]:
    """Day-by-day slot states for the public picker. States only
    (open/low/full/closed) — counts never leave the server (privacy P1–P3)."""
    now = manila_now()
    today = now.date()
    start = max(start, today)
    end = min(end, today + timedelta(days=30))
    if end < start:
        return []
    allow_sunday = (
        await _setting(db, "allow_sunday_bookings", "false")
    ).lower() == "true"
    reserve, low, _ = await _slot_numbers(db)
    capacities = await _capacity_by_day(db, start, end)
    booked = await _occupied_counts(db, start, end)
    holds = await _live_hold_counts(db, start, end, now)
    days: list[dict] = []
    day = start
    while day <= end:
        capacity = capacities.get(day, 0)
        slots = []
        for slot in SLOT_TIMES:
            label = slot.strftime("%H:%M")
            if _slot_closed(day, slot, now, allow_sunday) is not None:
                state = "closed"
            else:
                key = (day.isoformat(), label)
                taken = booked.get(key, 0) + holds.get(key, 0)
                left = _public_seats_left(
                    capacity=capacity, booked=booked.get(key, 0),
                    holds=holds.get(key, 0), reserve=reserve,
                )
                if left <= 0:
                    state = "full"
                # Low means filling, not empty: untouched slots read open.
                elif left <= low and taken > 0:
                    state = "low"
                else:
                    state = "open"
            slots.append({"time": label, "state": state})
        days.append({"date": day, "slots": slots})
        day += timedelta(days=1)
    return days


def _hold_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_hold(
    db: AsyncSession, *, day: date, slot: time, ttl_minutes: int | None = None
) -> tuple[BookingHold, str]:
    """Hold one seat for a guest still typing. Returns (row, raw token)."""
    now = manila_now()
    await _lock_slot(db, day, slot)
    # Housekeeping on write: expired holds never accumulate (no runner exists).
    await db.execute(delete(BookingHold).where(BookingHold.expires_at <= now))
    allow = True
    if day.weekday() == 6:
        allow = (await _setting(db, "allow_sunday_bookings", "false")).lower() == "true"
    reason = _slot_closed(day, slot, now, allow)
    if reason is not None:
        raise AppError("VAL_002", reason, 422)
    if ttl_minutes is None:
        _, _, ttl_minutes = await _slot_numbers(db)
    token = secrets.token_urlsafe(32)
    row = BookingHold(
        reference=generate_reference_id(),
        token_hash=_hold_token_hash(token),
        preferred_date=day, preferred_time=slot,
        expires_at=now + timedelta(minutes=max(1, ttl_minutes)),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row, token


async def _window_has_room(db: AsyncSession, day: date, window: str) -> bool:
    """True when any slot in the window still sells (submit-time only)."""
    _, slots = WINDOWS[window]
    for label in slots:
        hour, minute = int(label[:2]), int(label[3:])
        if await slot_availability(db, day, time(hour, minute)) > 0:
            return True
    return False


async def set_booking_slot(
    db: AsyncSession, booking: Booking, day: date, slot: time, duration_minutes: int | None = None
) -> Booking:
    """Admin sets or changes the booking time slot (no window restriction)."""
    if booking.status in TERMINAL_STATUSES:
        raise AppError("BOOKING_003", "Cannot change a closed booking.", 409)
    
    # Check for time overlap before assigning
    check_duration = duration_minutes or booking.estimated_duration_minutes or await _service_duration_minutes(db, booking) or 60
    has_overlap = await _has_time_overlap(db, day, slot, check_duration, exclude_booking_id=booking.id)
    if has_overlap:
        raise AppError("BOOKING_007", "Time slot overlaps with existing booking.", 409)
    
    await _lock_slot(db, day, slot)
    await validate_slot(db, day, slot)
    booking.preferred_date = day
    booking.preferred_time = slot
    booking.flex_window = None
    
    # Update duration if provided
    if duration_minutes is not None:
        booking.estimated_duration_minutes = duration_minutes

    await db.commit()
    await db.refresh(booking)
    from app.services.email_service import EmailService

    when = f"{day.isoformat()} at {slot.strftime('%I:%M %p').lstrip('0')}"
    if not EmailService().send(
        booking.customer_email,
        "KJAC: your service time is set",
        f"Good news — your booking {booking.reference_id} is set for {when}.\n"
        "Please make sure someone is home. Reply to this email for changes.",
    ):
        logger.warning("set-slot email not delivered for booking %s", booking.id)
    return booking


async def _consume_hold(
    db: AsyncSession, token: str, day: date, slot: time, now: datetime
) -> None:
    result = await db.execute(
        select(BookingHold).where(
            BookingHold.token_hash == _hold_token_hash(token),
            BookingHold.preferred_date == day, BookingHold.preferred_time == slot,
            BookingHold.consumed_at.is_(None),
        )
    )
    row = result.scalar_one_or_none()
    if row is None or row.expires_at.replace(tzinfo=UTC) <= now:
        raise AppError("BOOKING_003", "Hold expired. Pick your time again.", 409)
    row.consumed_at = now


async def check_create_rate_limit(
    db: AsyncSession, user: User | None, email: str
) -> None:
    # Admin-editable DB settings win; static server config is the fallback.
    try:
        limit_count = int(await _setting(db, "booking_rate_limit_count", ""))
        if limit_count <= 0:
            raise ValueError("non-positive")
    except ValueError:
        limit_count = settings.booking_rate_limit_count
    try:
        limit_minutes = int(await _setting(db, "booking_rate_limit_minutes", ""))
        if limit_minutes <= 0:
            raise ValueError("non-positive")
    except ValueError:
        limit_minutes = settings.booking_rate_limit_minutes
    window = manila_now().astimezone(UTC) - timedelta(minutes=limit_minutes)
    query = select(func.count(Booking.id)).where(Booking.created_at >= window)
    if user is not None:
        query = query.where(Booking.customer_id == user.id)
    else:
        query = query.where(func.lower(Booking.customer_email) == email.lower())
    count = (await db.execute(query)).scalar_one()
    if count >= limit_count:
        raise AppError(
            "BOOKING_004",
            f"Maximum {limit_count} bookings per "
            f"{limit_minutes} minutes.",
            429,
        )


async def _get_brand(db: AsyncSession, brand_id: int) -> AirconBrand:
    brand = await db.get(AirconBrand, brand_id)
    if brand is None or not brand.is_active or brand.deleted_at is not None:
        raise AppError("BOOKING_005", "Unknown or inactive brand.", 400)
    return brand


async def _notify_office(
    db: AsyncSession, type: str, title: str, message: str, booking_id: int | None = None
) -> None:
    """Fan out to active office users (owner + staff). Kept the old
    _notify_admins name as an alias below for existing call sites."""
    result = await db.execute(
        select(User.id).where(
            User.role.in_(("owner", "staff")),
            User.status == "active",
            User.deleted_at.is_(None),
        )
    )
    for (user_id,) in result.all():
        await notify(db, user_id, type, title, message, booking_id)


_notify_admins = _notify_office


async def _notify_customer(booking: Booking, type: str, title: str, message: str,
                           db: AsyncSession) -> None:
    if booking.customer_id is not None:  # guests get email only (Phase 4)
        await notify(db, booking.customer_id, type, title, message, booking.id)


async def get_booking_or_404(db: AsyncSession, booking_id: int) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.deleted_at is not None:
        raise AppError("BOOKING_001", "Booking not found.", 404)
    return booking


async def get_booking_by_reference(db: AsyncSession, reference_id: str) -> Booking:
    """Public-key lookup: unguessable reference, uniform 404 (no enumeration)."""
    result = await db.execute(
        select(Booking).where(
            func.lower(Booking.reference_id) == reference_id.strip().lower(),
            Booking.deleted_at.is_(None),
        )
    )
    booking = result.scalar_one_or_none()
    if booking is None:
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
    preferred_time: time | None = None,
    problem_description: str | None,
    hold_token: str | None = None,
    flex_window: str | None = None,
) -> Booking:
    if flex_window is not None and flex_window not in WINDOWS:
        raise AppError("VAL_001", "Unknown flexible window.", 422)
    if flex_window is not None and preferred_time is not None:
        anchor, _ = WINDOWS[flex_window]
        if preferred_time != anchor:
            raise AppError("VAL_001", "Window hour mismatch.", 422)
    
    # Only validate and lock slot if time is provided
    if preferred_time is not None:
        await _lock_slot(db, preferred_date, preferred_time)
        await validate_slot(db, preferred_date, preferred_time)
    
    await _get_brand(db, brand_id)
    service, down, total = await calc_down_payment(db, service_id)
    await check_create_rate_limit(db, user, email)
    if not province_code:
        # Strict: empty province only when the region truly has none
        # (cached upstream list, e.g. NCR). Else the box was skipped.
        from app.services import psgc_service as psgc

        siblings = await psgc.list_provinces(db, region_code)
        if siblings:
            raise AppError(
                "VAL_001", "Select a province.", 422,
                details=[{"field": "province_code", "message": "Select a province."}],
            )
    if user is not None and not UserService.is_profile_complete(user):
        raise AppError(
            "PROFILE_INCOMPLETE",
            "Complete your profile address before booking.", 422,
        )
    # Situational checks last: fixable input errors (422) must read before
    # "just filled" (409), or users chase the wrong problem.
    if hold_token and preferred_time is not None:
        await _consume_hold(db, hold_token, preferred_date, preferred_time, datetime.now(UTC))

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
        original_preferred_date=preferred_date,  # Store customer's original choice
        preferred_time=preferred_time,
        flex_window=flex_window,
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
    payment = await _latest_payment(db, booking.id)
    refund_status = refund_amount = refund_to_masked = payout_ref = None
    payment_status = payment.status if payment is not None else None
    rejection_reason = (
        payment.rejection_reason
        if payment is not None and payment.status == "rejected"
        else None
    )
    if booking.status in ("cancelled", "expired"):
        r = await db.execute(
            select(Refund)
            .where(Refund.booking_id == booking.id)
            .order_by(Refund.id.desc())
            .limit(1)
        )
        latest_refund = r.scalar_one_or_none()
        if latest_refund is not None:
            refund_status = latest_refund.status
            refund_amount = float(latest_refund.refund_amount)
            if latest_refund.refund_to_number:
                refund_to_masked = mask_phone(latest_refund.refund_to_number)
            payout_ref = latest_refund.payout_reference_number
    return {
        "booking_id": booking.id,
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
        "has_payment": payment is not None,
        "payment_status": payment_status,
        "rejection_reason": rejection_reason,
        "refund_status": refund_status,
        "refund_amount": refund_amount,
        "refund_to_masked": refund_to_masked,
        "payout_reference_number": payout_ref,
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
    db: AsyncSession, booking: Booking, user: User | None, reason: str,
    refund_to_number: str | None = None, refund_to_name: str | None = None,
) -> dict:
    if booking.status in TERMINAL_STATUSES:
        raise AppError("BOOKING_003", f"Cannot cancel a {booking.status} booking.", 409)

    now = manila_now()
    preferred_day = booking.preferred_date
    dispatched = await _is_dispatched(db, booking.id) or booking.status == "ongoing"
    # No verdict, no cancel, either side: a waiting receipt must be
    # verified or rejected first so refunds never judge unjudged money.
    under_review = await db.execute(
        select(Payment.id)
        .where(
            Payment.booking_id == booking.id,
            Payment.status == "pending",
        )
        .limit(1)
    )
    if under_review.scalar_one_or_none() is not None:
        raise AppError(
            "BOOKING_003",
            "Payment under review. Wait for the review result.",
            409,
        )
    # Rejected receipts are not money: only pending or verified counts as paid.
    # Rejected receipts are not money: only pending or verified counts as paid.
    valid_result = await db.execute(
        select(Payment)
        .where(
            Payment.booking_id == booking.id,
            Payment.status.in_(("pending", "verified")),
        )
        .order_by(Payment.id.desc())
        .limit(1)
    )
    payment = valid_result.scalar_one_or_none()
    paid = payment is not None

    if paid:
        # Target optional at cancel (office may not have it yet); required
        # before payout. Normalize when provided so ledger stays clean.
        if refund_to_number or refund_to_name:
            digits = re.sub(r"\D", "", refund_to_number or "")
            if not re.fullmatch(r"(09\d{9}|639\d{9})", digits):
                raise AppError(
                    "VAL_001",
                    "Enter active GCash number for refund.",
                    422,
                )
            refund_to_number = digits
            refund_to_name = (refund_to_name or "").strip() or None
        else:
            refund_to_number = None
            refund_to_name = None

    if booking.status in ("submitted", "pending"):
        tier = "immediate"
    elif not dispatched and preferred_day > now.date():
        tier = "advance"
    elif not dispatched:
        tier = "same_day"
    else:
        tier = "late"

    # Atomic claim first: concurrent cancellers serialize here, so one cancel
    # always means exactly one refund row. Tier was computed above from the
    # pre-claim read (same-action races are closed; cross-action interleavings
    # keep the pre-existing read semantics).
    claimed = await db.execute(
        update(Booking)
        .where(Booking.id == booking.id, Booking.status.not_in(TERMINAL_STATUSES))
        .values(
            status="cancelled",
            cancellation_reason=reason,
            cancelled_by_user_id=user.id if user is not None else None,
        )
    )
    if claimed.rowcount == 0:
        await db.refresh(booking)
        raise AppError("BOOKING_003", f"Cannot cancel a {booking.status} booking.", 409)
    await db.refresh(booking)

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
                    refund_to_number=refund_to_number,
                    refund_to_name=refund_to_name,
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
                    refund_to_number=refund_to_number,
                    refund_to_name=refund_to_name,
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
                    refund_to_number=refund_to_number,
                    refund_to_name=refund_to_name,
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
    """Confirmed/assigned-only, ≥24h notice, max 2 requests per booking (CONTRACTS U4)."""
    if booking.status not in ("confirmed", "assigned"):
        raise AppError("BOOKING_003", "Only confirmed or assigned bookings can be rescheduled.", 409)
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
    # Atomic claim: concurrent reviewers serialize here; the loser touches
    # zero rows and gets a clean 409 before the booking date can move.
    claimed = await db.execute(
        update(RescheduleRequest)
        .where(RescheduleRequest.id == request_id, RescheduleRequest.status == "pending")
        .values(
            status="approved" if approve else "denied",
            reviewed_by_user_id=admin.id,
            admin_notes=admin_notes,
            reviewed_at=datetime.now(UTC),
        )
    )
    if claimed.rowcount == 0:
        raise AppError("BOOKING_003", "Request already reviewed.", 409)
    await db.refresh(row)
    if approve:
        booking.preferred_date = row.new_preferred_date
        booking.preferred_time = row.new_preferred_time
        note, ntype = "approved for new slot", "reschedule_approved"
    else:
        note, ntype = "denied, original slot kept", "reschedule_denied"
    await _notify_customer(
        booking, ntype, f"Reschedule {row.status}",
        f"{booking.reference_id} reschedule {note}.", db,
    )
    await db.commit()
    return row


async def assign_technician(
    db: AsyncSession, booking: Booking, technician_id: int,
    expected_technician_id: int | None = None,
) -> Booking:
    """Assign with max-3-appointments-per-day guard (BR-005).

    expected_technician_id is the assignment the caller saw: a mismatch means
    another staffer just changed it, answered 409 instead of overwriting.
    """
    tech = await db.get(User, technician_id)
    if tech is None or tech.deleted_at is not None:
        raise AppError("BOOKING_005", "Technician not found.", 404)
    if tech.role != "technician" or tech.status != "active":
        raise AppError("BOOKING_005", "User is not an available technician.", 400)
    if booking.status in TERMINAL_STATUSES:
        raise AppError("BOOKING_003", "Cannot assign to a closed booking.", 409)
    if booking.status in ("submitted", "proposed", "scheduled", "pending"):
        raise AppError(
            "BOOKING_005",
            "Technician can only be assigned after payment is verified.",
            409,
        )
    
    # Check for time overlap before assigning (only if booking has a time slot)
    if booking.preferred_date and booking.preferred_time:
        duration = booking.estimated_duration_minutes or await _service_duration_minutes(db, booking) or 60
        has_overlap = await _has_time_overlap(
            db, 
            booking.preferred_date, 
            booking.preferred_time, 
            duration, 
            exclude_booking_id=booking.id
        )
        if has_overlap:
            raise AppError("BOOKING_007", "Time slot overlaps with existing booking.", 409)
    
    # Lock the tech's day-set so the max-3 count cannot race: a concurrent
    # assigner blocks here, then recounts after this transaction commits.
    day_load = (
        await db.execute(
            select(Booking.id)
            .where(
                Booking.technician_id == technician_id,
                Booking.preferred_date == booking.preferred_date,
                Booking.status.in_(("confirmed", "ongoing")),
                Booking.deleted_at.is_(None),
                Booking.id != booking.id,
            )
            .with_for_update()
        )
    ).scalars().all()
    if len(day_load) >= 3:
        raise AppError("BOOKING_006", "Technician is fully booked that day.", 409)
    # Optimistic claim on the seen value (None = was unassigned): whoever
    # changed it first wins, the loser refreshes instead of overwriting.
    claimed = await db.execute(
        update(Booking)
        .where(
            Booking.id == booking.id,
            Booking.status.not_in(TERMINAL_STATUSES),
            Booking.technician_id.is_not_distinct_from(expected_technician_id),
        )
        .values(technician_id=technician_id, status="assigned")
    )
    if claimed.rowcount == 0:
        raise AppError(
            "BOOKING_003",
            "Assignment just changed — refresh and try again.", 409,
        )
    await db.refresh(booking)
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


async def schedule_booking(
    db: AsyncSession, booking: Booking, preferred_date: date, preferred_time: time,
    duration_minutes: int | None = None
) -> Booking:
    """Admin proposes schedule for a submitted booking (submitted to proposed).

    Performs conflict detection to prevent overlapping time slots.
    Sends scheduled notification email.
    
    Args:
        db: Database session
        booking: Booking to schedule
        preferred_date: Date for the service
        preferred_time: Time for the service
        duration_minutes: Optional explicit duration (defaults to service duration or 60 mins)
    
    Returns:
        Updated booking with 'proposed' status
    
    Raises:
        AppError: If booking is not in 'submitted' status, if time slot overlaps with
                  existing 'proposed', 'scheduled', 'assigned', or 'ongoing' bookings, or if slot is invalid
    """
    if booking.status != "submitted":
        raise AppError(
            "BOOKING_003", 
            f"Only submitted bookings can have a schedule proposed. Current status: {booking.status}.", 
            409
        )
    
    # Validate the time slot
    await validate_slot(db, preferred_date, preferred_time)
    
    # Check for time overlap with other scheduled/assigned bookings
    check_duration = duration_minutes or booking.estimated_duration_minutes or await _service_duration_minutes(db, booking) or 60
    has_overlap = await _has_time_overlap(
        db, 
        preferred_date, 
        preferred_time, 
        check_duration, 
        exclude_booking_id=booking.id
    )
    if has_overlap:
        # Find conflicting booking for error message
        start_dt = datetime.combine(preferred_date, preferred_time)
        end_dt = start_dt + timedelta(minutes=check_duration)
        
        conflict_result = await db.execute(
            select(Booking.reference_id)
            .where(
                Booking.preferred_date == preferred_date,
                Booking.status.in_(("proposed", "scheduled", "assigned", "ongoing")),
                Booking.deleted_at.is_(None),
                Booking.id != booking.id,
            )
        )
        conflict_ref = conflict_result.scalars().first() or "unknown"
        raise AppError(
            "BOOKING_008", 
            f"Time slot conflicts with booking {conflict_ref}. Choose another time.",
            409
        )
    
    # Lock the slot to prevent concurrent double-booking
    await _lock_slot(db, preferred_date, preferred_time)
    
    # Update booking to 'proposed' status
    now = datetime.now(UTC)
    booking.status = "proposed"
    booking.preferred_date = preferred_date
    booking.preferred_time = preferred_time
    booking.proposed_at = now
    booking.flex_window = None
    # Pay deadline equals the proposed start itself, no buffer.
    # Countdown ticks to this start. Past start with no upload expires.
    try:
        manila_start = datetime.combine(preferred_date, preferred_time).replace(tzinfo=MANILA_TZ)
        booking.expires_at = manila_start.astimezone(UTC)
    except Exception:
        booking.expires_at = now + timedelta(hours=3)
    
    if duration_minutes is not None:
        booking.estimated_duration_minutes = duration_minutes
    
    # Record status change in history
    db.add(
        BookingStatusHistory(
            booking_id=booking.id,
            old_status="submitted",
            new_status="proposed",
            notes="Admin proposed booking schedule via schedule board",
        )
    )
    
    await db.flush()
    
    # Send scheduled notification email (date + start time only, no end time)
    from app.services.email_service import EmailService
    date_str = preferred_date.isoformat()
    time_str = preferred_time.strftime("%H:%M")
    email_sent = EmailService().send_booking_scheduled(
        booking.customer_email,
        booking.reference_id,
        date_str,
        time_str,
    )
    if not email_sent:
        logger.warning("booking scheduled email not delivered for booking %s", booking.id)
    
    # Send in-app notification for customers
    await _notify_customer(
        booking, "booking_scheduled", "Schedule Proposed",
        f"{booking.reference_id} - schedule proposed for {preferred_date} at {time_str}. Accept or decline.",
        db,
    )
    
    await db.commit()
    await db.refresh(booking)
    return booking


async def tech_update_status(
    db: AsyncSession, booking: Booking, marker: str, actor: User
) -> Booking:
    """Strict progression: confirmed/assigned→on_way→arrived→ongoing→completed.

    on_way/arrived keep booking.status (appointment meaning per C5 fix);
    ongoing/completed move it. Markers are history notes for dispatch checks.
    """
    if booking.status in ("cancelled", "expired", "completed"):
        raise AppError("BOOKING_003", f"Cannot update a {booking.status} booking.", 409)
    if actor.role not in ("owner", "staff") and booking.technician_id != actor.id:
        raise AppError("PERM_001", "Only the assigned technician can update this job.", 403)

    markers = await _tech_markers(db, booking.id)
    last = markers[-1] if markers else None
    if booking.status == "ongoing":
        expected: str | None = "completed"
    elif booking.status in ("confirmed", "assigned"):
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
    """Flip submitted and proposed bookings past expires_at to expired. Returns count."""
    result = await db.execute(
        Booking.__table__.update()
        .where(
            Booking.status.in_(["submitted", "proposed"]),
            Booking.expires_at.is_not(None),
            Booking.expires_at < datetime.now(UTC),
        )
        .values(status="expired")
    )
    await db.commit()
    return result.rowcount or 0


async def list_admin_bookings(
    db: AsyncSession,
    status: str | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    technician_id: int | None = None,
    brand_id: int | None = None,
    service_id: int | None = None,
    page: int = 1,
    limit: int = 20,
    sort_by: str | None = None,
    sort_dir: str = "desc",
) -> tuple[int, list[dict], dict[str, int]]:
    """Office dispatch list: filtered page + nested display records + summary.

    Read-only. Names, latest payment, pending reschedule, timeline, and full
    addresses are batched per page (no per-row queries) so the board stays
    one round trip. Summary counts ignore the status filter only.
    Sort allowlist: newest (id), schedule (date + time), customer (last, first).
    """
    filters = [Booking.deleted_at.is_(None)]
    if technician_id:
        filters.append(Booking.technician_id == technician_id)
    if brand_id:
        filters.append(Booking.brand_id == brand_id)
    if service_id:
        filters.append(Booking.service_id == service_id)
    if date_from:
        filters.append(Booking.preferred_date >= date_from)
    if date_to:
        filters.append(Booking.preferred_date <= date_to)
    if search and search.strip():
        like = f"%{search.strip()}%"
        filters.append(
            or_(
                Booking.reference_id.ilike(like),
                Booking.customer_first_name.ilike(like),
                Booking.customer_last_name.ilike(like),
                Booking.customer_email.ilike(like),
                Booking.customer_phone.ilike(like),
            )
        )
    summary_rows = (
        await db.execute(
            select(Booking.status, func.count(Booking.id))
            .where(*filters)
            .group_by(Booking.status)
        )
    ).all()
    summary: dict[str, int] = {row[0]: row[1] for row in summary_rows}
    summary["all"] = sum(summary.values())
    if status:
        filters.append(Booking.status == status)
    query = select(Booking).where(*filters)
    total = (
        await db.execute(select(func.count()).select_from(query.subquery()))
    ).scalar_one()
    sort_columns = {
        "newest": (Booking.id,),
        "schedule": (Booking.preferred_date, Booking.preferred_time, Booking.id),
        "customer": (Booking.customer_last_name, Booking.customer_first_name, Booking.id),
    }
    direction = asc if sort_dir == "asc" else desc
    ordering = [direction(col) for col in sort_columns.get(sort_by or "newest", sort_columns["newest"])]
    rows = (
        await db.execute(
            query.order_by(*ordering).offset((page - 1) * limit).limit(limit)
        )
    ).scalars().all()
    if not rows:
        return total, [], summary

    service_map = {
        s.id: s
        for s in (
            await db.execute(
                select(Service).where(
                    Service.id.in_({b.service_id for b in rows})
                )
            )
        ).scalars()
    }
    brand_map = {
        b.id: b
        for b in (
            await db.execute(
                select(AirconBrand).where(
                    AirconBrand.id.in_({b.brand_id for b in rows})
                )
            )
        ).scalars()
    }
    barangay_codes = {b.barangay_code for b in rows if b.barangay_code}
    city_codes = {b.city_municipality_code for b in rows if b.city_municipality_code}
    province_codes = {b.province_code for b in rows if b.province_code}
    region_codes = {b.region_code for b in rows if b.region_code}
    barangay_map = (
        {
            r.barangay_code: r.barangay_name
            for r in (
                await db.execute(
                    select(PsgcBarangay).where(PsgcBarangay.barangay_code.in_(barangay_codes))
                )
            ).scalars()
        }
        if barangay_codes
        else {}
    )
    city_map = (
        {
            r.city_municipality_code: r.city_municipality_name
            for r in (
                await db.execute(
                    select(PsgcCityMunicipality).where(
                        PsgcCityMunicipality.city_municipality_code.in_(city_codes)
                    )
                )
            ).scalars()
        }
        if city_codes
        else {}
    )
    province_map = (
        {
            r.province_code: r.province_name
            for r in (
                await db.execute(
                    select(PsgcProvince).where(PsgcProvince.province_code.in_(province_codes))
                )
            ).scalars()
        }
        if province_codes
        else {}
    )
    region_map = (
        {
            r.region_code: r.region_name
            for r in (
                await db.execute(
                    select(PsgcRegion).where(PsgcRegion.region_code.in_(region_codes))
                )
            ).scalars()
        }
        if region_codes
        else {}
    )
    tech_ids = {b.technician_id for b in rows if b.technician_id}
    tech_map = (
        {
            u.id: u
            for u in (
                await db.execute(select(User).where(User.id.in_(tech_ids)))
            ).scalars()
        }
        if tech_ids
        else {}
    )
    booking_ids = [b.id for b in rows]
    payment_rows = (
        await db.execute(
            select(Payment)
            .where(Payment.booking_id.in_(booking_ids))
            .order_by(Payment.booking_id, Payment.id.desc())
        )
    ).scalars()
    payment_map: dict[int, Payment] = {}
    for p in payment_rows:
        payment_map.setdefault(p.booking_id, p)
    refund_map: dict[int, Refund] = {}
    for r in (
        await db.execute(
            select(Refund)
            .where(Refund.booking_id.in_(booking_ids))
            .order_by(Refund.booking_id, Refund.id.desc())
        )
    ).scalars():
        refund_map.setdefault(r.booking_id, r)
    reschedule_map = {
        r.booking_id: r
        for r in (
            await db.execute(
                select(RescheduleRequest).where(
                    RescheduleRequest.booking_id.in_(booking_ids),
                    RescheduleRequest.status == "pending",
                )
            )
        ).scalars()
    }
    history_rows = (
        await db.execute(
            select(BookingStatusHistory)
            .where(BookingStatusHistory.booking_id.in_(booking_ids))
            .order_by(BookingStatusHistory.id)
        )
    ).scalars()
    timeline_map: dict[int, list[dict]] = {}
    for h in history_rows:
        timeline_map.setdefault(h.booking_id, []).append(
            {"old_status": h.old_status, "new_status": h.new_status,
             "at": h.created_at, "note": h.notes}
        )

    items: list[dict] = []
    for b in rows:
        service = service_map.get(b.service_id)
        brand = brand_map.get(b.brand_id)
        tech = tech_map.get(b.technician_id) if b.technician_id else None
        payment = payment_map.get(b.id)
        reschedule = reschedule_map.get(b.id)
        refund = refund_map.get(b.id)
        address_parts = [
            b.street_address,
            barangay_map.get(b.barangay_code or ""),
            city_map.get(b.city_municipality_code or ""),
            province_map.get(b.province_code or ""),
            region_map.get(b.region_code or ""),
        ]
        items.append(
            {
                "id": b.id,
                "reference_id": b.reference_id,
                "status": b.status,
                "customer_first_name": b.customer_first_name,
                "customer_last_name": b.customer_last_name,
                "customer_email": b.customer_email,
                "customer_phone": b.customer_phone,
                "service_id": b.service_id,
                "brand_id": b.brand_id,
                "preferred_date": b.preferred_date,
                "preferred_time": b.preferred_time,
                "flex_window": b.flex_window,
                "dispatch_order": b.dispatch_order,
                "down_payment_amount": float(b.down_payment_amount),
                "total_service_cost": (
                    float(b.total_service_cost)
                    if b.total_service_cost is not None else None
                ),
                "expires_at": b.expires_at,
                "technician_id": b.technician_id,
                "technician": (
                    {
                        "id": tech.id,
                        "name": f"{tech.first_name} {tech.last_name}".strip(),
                        "rating": (
                            float(tech.average_rating)
                            if tech.average_rating is not None else None
                        ),
                    }
                    if tech else None
                ),
                "service_name": service.name if service else None,
                "service_estimated_duration_minutes": (
                    b.estimated_duration_minutes or (service.estimated_duration_minutes if service else None)
                ),
                "brand_name": brand.name if brand else None,
                "brand_is_partner": bool(brand and brand.is_partner),
                "address_text": ", ".join(p for p in address_parts if p),
                "address_parts": {
                    "street": b.street_address,
                    "barangay": barangay_map.get(b.barangay_code or ""),
                    "city": city_map.get(b.city_municipality_code or ""),
                    "province": province_map.get(b.province_code or ""),
                    "region": region_map.get(b.region_code or ""),
                },
                "landmark": b.landmark,
                "payment": (
                    {
                        "id": payment.id,
                        "uuid": str(payment.uuid),
                        "status": payment.status,
                        "amount": float(payment.amount),
                        "gcash_reference_number": payment.gcash_reference_number,
                        "submitted_at": payment.created_at,
                    }
                    if payment else None
                ),
                "active_reschedule": (
                    {
                        "id": reschedule.id,
                        "old_date": reschedule.old_preferred_date,
                        "old_time": reschedule.old_preferred_time,
                        "new_date": reschedule.new_preferred_date,
                        "new_time": reschedule.new_preferred_time,
                        "reason": reschedule.reason,
                    }
                    if reschedule else None
                ),
                "timeline": timeline_map.get(b.id, []),
                "created_at": b.created_at,
                "updated_at": b.updated_at,
                "cancellation_reason": b.cancellation_reason,
                "refund": (
                    {
                        "status": refund.status,
                        "refund_amount": float(refund.refund_amount),
                        "refund_to_number": refund.refund_to_number,
                        "refund_to_name": refund.refund_to_name,
                    }
                    if refund else None
                ),
            }
        )
    return total, items, summary


# ---------------------------------------------------------------------------
# Phase B: office vacancy, guest waitlist, reminders.
# ---------------------------------------------------------------------------

async def vacancy_range(
    db: AsyncSession, start: date, end: date
) -> list[dict]:
    """Office vacancy: public states PLUS the numbers behind them
    (capacity, booked, holds, seats left). Same counters as the public
    range — office eyes only, never served to guests."""
    now = manila_now()
    today = now.date()
    start = max(start, today)
    end = min(end, today + timedelta(days=30))
    if end < start:
        return []
    allow_sunday = (
        await _setting(db, "allow_sunday_bookings", "false")
    ).lower() == "true"
    reserve, low, _ = await _slot_numbers(db)
    capacities = await _capacity_by_day(db, start, end)
    booked = await _occupied_counts(db, start, end)
    holds = await _live_hold_counts(db, start, end, now)
    days: list[dict] = []
    day = start
    while day <= end:
        capacity = capacities.get(day, 0)
        slots = []
        for slot in SLOT_TIMES:
            label = slot.strftime("%H:%M")
            key = (day.isoformat(), label)
            taken = booked.get(key, 0) + holds.get(key, 0)
            if _slot_closed(day, slot, now, allow_sunday) is not None:
                state = "closed"
                left = 0
            else:
                left = _public_seats_left(
                    capacity=capacity, booked=booked.get(key, 0),
                    holds=holds.get(key, 0), reserve=reserve,
                )
                if left <= 0:
                    state = "full"
                elif left <= low and taken > 0:
                    state = "low"
                else:
                    state = "open"
            slots.append({
                "time": label, "state": state, "capacity": capacity,
                "booked": booked.get(key, 0), "holds": holds.get(key, 0),
                "left": left,
            })
        days.append({"date": day, "slots": slots})
        day += timedelta(days=1)
    return days


WAITLIST_STATUSES = ("waiting", "offered", "removed")


async def _waitlist_day_is_full(db: AsyncSession, day: date) -> bool:
    """A day takes waitlist entries only when no slot still sells."""
    rows = await vacancy_range(db, day, day)
    if not rows:
        return True
    return all(s["state"] in ("full", "closed") for s in rows[0]["slots"])


async def join_waitlist(
    db: AsyncSession, *, day: date, name: str, phone: str, email: str
) -> BookingWaitlist:
    """Guest joins the line for a full day. Email required: the offer
    arrives as a booking link, and there is no SMS channel."""
    today = manila_now().date()
    if day < today:
        raise AppError("VAL_002", "That day already passed.", 422)
    if day > today + timedelta(days=30):
        raise AppError("VAL_002", "Cannot waitlist more than 30 days ahead.", 422)
    if day.weekday() == 6:
        allow = (await _setting(db, "allow_sunday_bookings", "false")).lower() == "true"
        if not allow:
            raise AppError("VAL_002", "Sunday bookings are not available.", 422)
    if not await _waitlist_day_is_full(db, day):
        raise AppError("VAL_002", "That day still has room — book directly.", 422)
    cap = int(await _setting(db, "waitlist_per_day_cap", "10") or 10)
    waiting = (
        await db.execute(
            select(func.count(BookingWaitlist.id)).where(
                BookingWaitlist.preferred_date == day,
                BookingWaitlist.status.in_(("waiting", "offered")),
            )
        )
    ).scalar_one()
    if waiting >= max(1, cap):
        raise AppError("BOOKING_003", "The waitlist for that day is full.", 409)
    row = BookingWaitlist(
        preferred_date=day, name=name.strip(), phone=phone.strip(),
        email=email.strip().lower(),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await _notify_office(
        db, "waitlist_joined", "New waitlist entry",
        f"{row.name} is waiting on {day.isoformat()} ({waiting + 1} in line).",
    )
    await db.commit()
    return row


async def list_waitlist(db: AsyncSession, day: date) -> list[BookingWaitlist]:
    result = await db.execute(
        select(BookingWaitlist)
        .where(
            BookingWaitlist.preferred_date == day,
            BookingWaitlist.status.in_(("waiting", "offered")),
        )
        .order_by(asc(BookingWaitlist.id))
    )
    return list(result.scalars().all())


async def get_waitlist_entry_or_404(db: AsyncSession, entry_id: int) -> BookingWaitlist:
    row = await db.get(BookingWaitlist, entry_id)
    if row is None:
        raise AppError("BOOKING_001", "Waitlist entry not found.", 404)
    return row


async def offer_waitlist_slot(
    db: AsyncSession, *, entry_id: int, slot: time
) -> tuple[BookingWaitlist, str]:
    """Office offers a freed seat: guard-checked hold (24h) + emailed
    booking link. The hold does the honest work — no room, no offer."""
    entry = await get_waitlist_entry_or_404(db, entry_id)
    if entry.status != "waiting":
        raise AppError("BOOKING_003", "That entry is already handled.", 409)
    day = entry.preferred_date
    if day < manila_now().date():
        raise AppError("VAL_002", "That day already passed.", 422)
    await validate_slot(db, day, slot)
    ttl_hours = int(await _setting(db, "waitlist_offer_ttl_hours", "24") or 24)
    hold, token = await create_hold(
        db, day=day, slot=slot, ttl_minutes=max(1, ttl_hours) * 60
    )
    entry.status = "offered"
    entry.offer_hold_id = hold.id
    await db.commit()
    await db.refresh(entry)
    link = (
        f"{settings.public_app_url.rstrip('/')}/book"
        f"?hold={token}&date={day.isoformat()}&time={slot.strftime('%H:%M')}"
    )
    when = f"{day.isoformat()} at {slot.strftime('%I:%M %p').lstrip('0')}"
    from app.services.email_service import EmailService

    if entry.email and not EmailService().send(
        entry.email,
        "KJAC: a slot opened for you",
        f"Good news, {entry.name} — a seat opened on {when}.\n"
        f"Book it here within {ttl_hours} hours (first come, first served):\n{link}",
    ):
        logger.warning("waitlist offer email not delivered for entry %s", entry.id)
    return entry, link


async def remove_waitlist_entry(db: AsyncSession, entry_id: int) -> BookingWaitlist:
    entry = await get_waitlist_entry_or_404(db, entry_id)
    entry.status = "removed"
    await db.commit()
    await db.refresh(entry)
    return entry


async def _get_roster_tech_or_404(db: AsyncSession, user_id: int) -> User:
    user = await db.get(User, user_id)
    if (
        user is None or user.deleted_at is not None
        or user.role != "technician" or user.status != "active"
    ):
        raise AppError("BOOKING_001", "Technician not found.", 404)
    return user


def _tech_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip() or user.email


async def get_roster(db: AsyncSession) -> list[dict]:
    """Crew + weekly template + leave. Days default all-working; only
    stored rows change the picture (see _capacity_by_day)."""
    techs = (
        await db.execute(
            select(User).where(
                User.role == "technician", User.status == "active",
                User.deleted_at.is_(None),
            )
            .order_by(asc(User.first_name), asc(User.last_name))
        )
    ).scalars().all()
    ids = [t.id for t in techs]
    days_map: dict[int, list[bool]] = {i: [True] * 7 for i in ids}
    leave_map: dict[int, list[dict]] = {i: [] for i in ids}
    if ids:
        for row in (
            await db.execute(
                select(TechnicianWorkday).where(TechnicianWorkday.user_id.in_(ids))
            )
        ).scalars().all():
            days_map[row.user_id][row.weekday] = row.is_working
        for row in (
            await db.execute(
                select(TechnicianTimeOff).where(TechnicianTimeOff.user_id.in_(ids))
                .order_by(asc(TechnicianTimeOff.date_from))
            )
        ).scalars().all():
            leave_map[row.user_id].append({
                "id": row.id, "date_from": row.date_from,
                "date_to": row.date_to, "reason": row.reason,
            })
    return [
        {"user_id": t.id, "name": _tech_name(t),
         "days": days_map[t.id], "leave": leave_map[t.id]}
        for t in techs
    ]


async def set_workdays(
    db: AsyncSession, user_id: int, days: list[bool]
) -> dict:
    """Replace one tech's weekly template (exactly 7 flags, Mon..Sun)."""
    await _get_roster_tech_or_404(db, user_id)
    await db.execute(
        delete(TechnicianWorkday).where(TechnicianWorkday.user_id == user_id)
    )
    for weekday, working in enumerate(days):
        db.add(TechnicianWorkday(
            user_id=user_id, weekday=weekday, is_working=working
        ))
    await db.commit()
    roster = await get_roster(db)
    return next(r for r in roster if r["user_id"] == user_id)


async def add_time_off(
    db: AsyncSession, *, user_id: int, date_from: date, date_to: date,
    reason: str | None,
) -> TechnicianTimeOff:
    await _get_roster_tech_or_404(db, user_id)
    row = TechnicianTimeOff(
        user_id=user_id, date_from=date_from, date_to=date_to, reason=reason
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def delete_time_off(db: AsyncSession, leave_id: int) -> None:
    row = await db.get(TechnicianTimeOff, leave_id)
    if row is None:
        raise AppError("BOOKING_001", "Time-off entry not found.", 404)
    await db.delete(row)
    await db.commit()


async def set_day_order(
    db: AsyncSession, *, day: date, ordered_ids: list[int]
) -> list[int]:
    """Manual day-plan order: listed ids take positions 1..n, every other
    occupying booking that day goes unordered (NULL, sorts by time).
    The office owns the roads; the system only stores the sequence."""
    if len(set(ordered_ids)) != len(ordered_ids):
        raise AppError("VAL_001", "Duplicate booking in day order.", 422)
    rows = (
        await db.execute(
            select(Booking).where(
                Booking.preferred_date == day,
                Booking.deleted_at.is_(None),
                Booking.status.in_(OCCUPYING_STATUSES),
            )
        )
    ).scalars().all()
    by_id = {b.id: b for b in rows}
    for booking_id in ordered_ids:
        if booking_id not in by_id:
            raise AppError("BOOKING_001", "Booking not found for that day.", 404)
    wanted = set(ordered_ids)
    for position, booking_id in enumerate(ordered_ids, start=1):
        by_id[booking_id].dispatch_order = position
    for booking_id, row in by_id.items():
        if booking_id not in wanted:
            row.dispatch_order = None
    await db.commit()
    return ordered_ids


async def run_reminders(db: AsyncSession) -> dict:
    """One pass of guest nudges. Toggles live in system_settings; the runner
    (db cron, Phase B ops) calls this. Manual trigger: POST /admin/reminders/run."""
    now = manila_now()
    sent_tomorrow = sent_payment = 0
    from app.services.email_service import EmailService

    mail = EmailService()
    if (await _setting(db, "reminder_booking_tomorrow_enabled", "true")).lower() == "true":
        tomorrow = now.date() + timedelta(days=1)
        result = await db.execute(
            select(Booking).where(
                Booking.preferred_date == tomorrow,
                Booking.status.in_(("pending", "confirmed")),
                Booking.deleted_at.is_(None),
            )
        )
        for booking in result.scalars().all():
            when = booking.preferred_time.strftime("%I:%M %p").lstrip("0")
            if booking.flex_window == "morning":
                when = "morning (we arrive 8–12)"
            elif booking.flex_window == "afternoon":
                when = "afternoon (we arrive 12–4)"
            if mail.send(
                booking.customer_email,
                "KJAC: your service is tomorrow",
                f"Hi {booking.customer_first_name} — your booking "
                f"{booking.reference_id} is tomorrow, {when}.\n"
                "Please make sure someone is home. Reply to this email for changes.",
            ):
                sent_tomorrow += 1
            if booking.customer_id is not None:
                await notify(
                    db, booking.customer_id, "booking_reminder_tomorrow",
                    "Service tomorrow",
                    f"Booking {booking.reference_id} is tomorrow, {when}.",
                    booking.id,
                )
    if (await _setting(db, "reminder_payment_expiring_enabled", "true")).lower() == "true":
        soon = now + timedelta(hours=2)
        result = await db.execute(
            select(Booking).where(
                Booking.status == "submitted",
                Booking.deleted_at.is_(None),
                Booking.expires_at.is_not(None),
                Booking.expires_at > now,
                Booking.expires_at <= soon,
                Booking.payment_reminder_sent_at.is_(None),
            )
        )
        for booking in result.scalars().all():
            if mail.send(
                booking.customer_email,
                "KJAC: payment expiring soon",
                f"Hi {booking.customer_first_name} — booking {booking.reference_id} "
                "is held for 3 hours and the window is almost up.\n"
                "Upload your GCash receipt soon or the slot goes back up for grabs.",
            ):
                sent_payment += 1
            booking.payment_reminder_sent_at = now
            if booking.customer_id is not None:
                await notify(
                    db, booking.customer_id, "payment_reminder",
                    "Payment expiring",
                    f"Booking {booking.reference_id} expires soon — upload your receipt.",
                    booking.id,
                )
    await db.commit()
    return {"tomorrow_sent": sent_tomorrow, "payment_sent": sent_payment}
