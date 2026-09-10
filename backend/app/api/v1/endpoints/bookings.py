"""Booking lifecycle endpoints (guest + authenticated)."""

from fastapi import APIRouter, Query, Request, status

from app.api.deps import CurrentUser, DbDep, OptionalUser
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.schemas.booking import (
    BookingCreate,
    BookingListResponse,
    BookingResponse,
    CancelRequest,
    CancelResponse,
    RescheduleRequest,
    RescheduleResponse,
    TrackResponse,
)
from app.services import booking_service as bookings
from app.services.turnstile_service import verify_turnstile

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _to_response(booking) -> BookingResponse:
    return BookingResponse.model_validate(booking)


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
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
    )
    return _to_response(booking)


@router.get("/track/{reference_id}", response_model=TrackResponse)
@limiter.limit("100/minute")
async def track_booking(
    request: Request,
    reference_id: str,
    db: DbDep,
    email: str = Query(..., min_length=3, max_length=255),
) -> TrackResponse:
    data = await bookings.track_booking(db, reference_id, email)
    return TrackResponse.model_validate(data)


@router.get("/me", response_model=BookingListResponse)
@limiter.limit("300/minute")
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
@limiter.limit("10/minute")
async def cancel_booking(
    request: Request, booking_id: int, payload: CancelRequest, db: DbDep,
    user: OptionalUser,
) -> CancelResponse:
    booking = await bookings.get_booking_or_404(db, booking_id)
    bookings.assert_owner(booking, user, str(payload.email) if payload.email else None)
    result = await bookings.cancel_booking(db, booking, user, payload.reason)
    return CancelResponse.model_validate(result)


@router.post("/{booking_id}/reschedule", response_model=RescheduleResponse,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
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
