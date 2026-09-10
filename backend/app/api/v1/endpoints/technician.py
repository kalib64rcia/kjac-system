"""Technician job status progression (assigned tech or admin)."""

from fastapi import APIRouter, Request

from app.api.deps import CurrentUser, DbDep
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.schemas.booking import BookingResponse, TechStatusUpdate
from app.services import booking_service as bookings

router = APIRouter(prefix="/technician", tags=["technician"])


@router.patch("/jobs/{booking_id}/status", response_model=BookingResponse)
@limiter.limit("60/minute")
async def update_job_status(
    request: Request, booking_id: int, payload: TechStatusUpdate,
    db: DbDep, user: CurrentUser,
) -> BookingResponse:
    if user is None:
        raise AppError("AUTH_001", "Not authenticated.", 401)
    if user.status != "active":
        raise AppError("PERM_001", "Account is not active.", 403)
    booking = await bookings.get_booking_or_404(db, booking_id)
    updated = await bookings.tech_update_status(db, booking, payload.status, user)
    return BookingResponse.model_validate(updated)
