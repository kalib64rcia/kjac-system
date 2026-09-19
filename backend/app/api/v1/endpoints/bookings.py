"""Booking lifecycle endpoints (guest + authenticated)."""

from fastapi import APIRouter, Query, Request, status

from app.api.deps import CurrentUser, DbDep, OptionalUser
from app.core.errors import AppError
from app.core.rate_limit import conditional_limit
from app.schemas.booking import (
    BookingCreate,
    BookingListResponse,
    BookingResponse,
    CancelRequest,
    CancelResponse,
    RescheduleRequest,
    RescheduleResponse,
    TrackResponse,
    ScheduleRequest,
    ScheduleResponse,
)
from app.services import booking_service as bookings
from app.services.turnstile_service import verify_turnstile

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _to_response(booking) -> BookingResponse:
    return BookingResponse.model_validate(booking)


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
@conditional_limit("10/minute")
async def create_booking(
    request: Request, payload: BookingCreate, db: DbDep, user: OptionalUser
) -> BookingResponse:
    if user is None:
        client_ip = request.client.host if request.client else None
        if not verify_turnstile(payload.turnstile_token, client_ip):
            raise AppError("VAL_003", "CAPTCHA verification failed.", 400)
    booking = await bookings.create_booking(
        db,
        user=user,
        first_name=payload.customer_first_name,
        last_name=payload.customer_last_name,
        email=str(payload.customer_email),
        phone=payload.customer_phone,
        region_code=payload.region_code,
        province_code=payload.province_code,
        city_municipality_code=payload.city_municipality_code,
        barangay_code=payload.barangay_code,
        street_address=payload.street_address,
        landmark=payload.landmark,
        service_id=payload.service_id,
        brand_id=payload.brand_id,
        preferred_date=payload.preferred_date,
        preferred_time=payload.preferred_time,
        problem_description=payload.problem_description,
        hold_token=payload.hold_token,
        flex_window=payload.flex_window,
    )
    return _to_response(booking)


@router.get("/track/{reference_id}", response_model=TrackResponse)
@conditional_limit("100/minute")
async def track_booking(
    request: Request,
    reference_id: str,
    db: DbDep,
    email: str = Query(..., min_length=3, max_length=255),
) -> TrackResponse:
    data = await bookings.track_booking(db, reference_id, email)
    return TrackResponse.model_validate(data)


@router.get("/me", response_model=BookingListResponse)
@conditional_limit("300/minute")
async def my_bookings(
    request: Request,
    db: DbDep,
    user: CurrentUser,
    booking_status: str | None = Query(default=None, max_length=20),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> BookingListResponse:
    from sqlalchemy import func, select

    from app.models.bookings import Booking

    if user is None:
        raise AppError("AUTH_001", "Not authenticated.", 401)
    query = select(Booking).where(
        Booking.customer_id == user.id, Booking.deleted_at.is_(None)
    )
    if booking_status:
        query = query.where(Booking.status == booking_status)
    total = (
        await db.execute(select(func.count()).select_from(query.subquery()))
    ).scalar_one()
    rows = (
        await db.execute(
            query.order_by(Booking.id.desc()).offset((page - 1) * limit).limit(limit)
        )
    ).scalars()
    return BookingListResponse(
        total=total, items=[BookingResponse.model_validate(b) for b in rows]
    )


@router.post("/{booking_id}/cancel", response_model=CancelResponse)
@conditional_limit("10/minute")
async def cancel_booking(
    request: Request, booking_id: int, payload: CancelRequest, db: DbDep,
    user: OptionalUser,
) -> CancelResponse:
    booking = await bookings.get_booking_or_404(db, booking_id)
    bookings.assert_owner(booking, user, str(payload.email) if payload.email else None)
    result = await bookings.cancel_booking(
        db, booking, user, payload.reason,
        payload.refund_to_number, payload.refund_to_name,
    )
    return CancelResponse.model_validate(result)


@router.post("/{booking_id}/reschedule", response_model=RescheduleResponse,
             status_code=status.HTTP_201_CREATED)
@conditional_limit("10/minute")
async def reschedule_booking(
    request: Request, booking_id: int, payload: RescheduleRequest, db: DbDep,
    user: OptionalUser,
) -> RescheduleResponse:
    booking = await bookings.get_booking_or_404(db, booking_id)
    bookings.assert_owner(booking, user, str(payload.email) if payload.email else None)
    row = await bookings.request_reschedule(
        db, booking, user, payload.new_preferred_date,
        payload.new_preferred_time, payload.reason,
    )
    return RescheduleResponse(reschedule_id=row.id, status=row.status)


@router.post("/{booking_id}/schedule", response_model=ScheduleResponse,
             status_code=status.HTTP_201_CREATED)
@conditional_limit("10/minute")
async def schedule_booking(
    request: Request, booking_id: int, payload: ScheduleRequest, db: DbDep,
    user: CurrentUser,
) -> ScheduleResponse:
    """Admin endpoint: propose a schedule for a submitted booking.
    
    Transitions booking from 'submitted' to 'proposed' status after validating
    the time slot and checking for conflicts with existing proposed/scheduled/assigned/ongoing bookings.
    Sends schedule proposal notification email to customer (date + start time only).
    Customer can then accept or decline via /track page.
    """
    if user is None or user.role not in ("owner", "staff"):
        raise AppError("PERM_001", "Only admin staff can propose bookings.", 403)
    
    booking = await bookings.get_booking_or_404(db, booking_id)
    result = await bookings.schedule_booking(
        db, booking, payload.preferred_date, payload.preferred_time,
        payload.duration_minutes
    )
    return ScheduleResponse(
        booking_id=result.id,
        status=result.status,
        proposed_at=result.proposed_at,
        preferred_date=result.preferred_date,
        preferred_time=result.preferred_time,
    )


@router.delete("/{booking_id}/schedule")
@conditional_limit("10/minute")
async def unschedule_booking(
    request: Request,
    booking_id: int,
    db: DbDep,
    user: CurrentUser,
) -> dict[str, bool]:
    """Remove booking from schedule (proposed/scheduled → submitted).
    
    Admin-only. Transitions booking from 'proposed' or 'scheduled' back to 'submitted' status,
    clearing the time slot and proposed_at/scheduled_at timestamps. Booking returns to pool
    of unscheduled bookings. Customer can rebook.
    """
    if user is None or user.role not in ("owner", "staff"):
        raise AppError("PERM_001", "Only admin staff can unschedule bookings.", 403)

    booking = await bookings.get_booking_or_404(db, booking_id)

    if booking.status not in ("proposed", "scheduled"):
        raise AppError(
            "BOOKING_009",
            f"Only proposed or scheduled bookings can be unscheduled. Current status: {booking.status}.",
            409
        )

    # Atomic withdraw: the status flip, the pending-payment guard, and the
    # voiding happen in one transaction, so a receipt landing mid-action
    # either blocks the withdraw or fails cleanly against submitted status.
    from sqlalchemy import exists, select, update

    from app.models.bookings import Booking, BookingStatusHistory
    from app.models.financial import Payment

    old_status = booking.status
    claimed = await db.execute(
        update(Booking)
        .where(
            Booking.id == booking.id,
            Booking.status.in_(("proposed", "scheduled")),
            ~exists(
                select(Payment.id).where(
                    Payment.booking_id == booking.id,
                    Payment.status == "pending",
                )
            ),
        )
        .values(
            status="submitted",
            proposed_at=None,
            scheduled_at=None,
            preferred_time=None,
            flex_window=None,
        )
    )
    if claimed.rowcount == 0:
        raise AppError(
            "BOOKING_009",
            "Schedule changed. A payment may be under review. Refresh and try again.",
            409,
        )
    # Void any waiting receipts left by older flows so no dead Verify lingers.
    await db.execute(
        update(Payment)
        .where(Payment.booking_id == booking.id, Payment.status == "pending")
        .values(status="rejected", rejection_reason="Schedule withdrawn by office.")
    )

    # Record status change in history
    db.add(
        BookingStatusHistory(
            booking_id=booking.id,
            old_status=old_status,
            new_status="submitted",
            notes="Admin removed booking from schedule",
        )
    )

    await db.flush()
    await bookings._notify_customer(
        booking, "booking_schedule_withdrawn", "Schedule withdrawn",
        f"{booking.reference_id}: the proposed schedule was withdrawn. "
        "A new proposal will follow.",
        db,
    )
    # Direct email to the booking address (guests have no inbox).
    # Best effort, never breaks the withdraw.
    from app.services.email_service import EmailService

    try:
        EmailService().send(
            booking.customer_email,
            "KJAC: Schedule withdrawn",
            f"{booking.reference_id}: the proposed schedule was withdrawn. "
            "A new proposal will follow.",
        )
    except Exception:
        pass

    await db.commit()
    return {"success": True}
