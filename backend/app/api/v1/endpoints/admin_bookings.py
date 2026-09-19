"""Admin booking dispatch list (office reads; actions live in bookings/payments)."""

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Query, Request

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.rate_limit import limiter
from app.schemas.booking import (
    AdminBookingListResponse,
    AdminBookingOut,
    CancelRequest,
    CancelResponse,
)
from app.services import booking_service as bookings

router = APIRouter(prefix="/admin/bookings", tags=["admin-bookings"])


@router.get("", response_model=AdminBookingListResponse)
@limiter.limit("300/minute")
async def list_admin_bookings(
    request: Request,
    db: DbDep,
    user: AdminTwoFaUser,
    booking_status: Annotated[str | None, Query(max_length=20, alias="status")] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    technician_id: Annotated[int | None, Query(gt=0)] = None,
    brand_id: Annotated[int | None, Query(gt=0)] = None,
    service_id: Annotated[int | None, Query(gt=0)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_by: Annotated[Literal["newest", "schedule", "customer"] | None, Query()] = None,
    sort_dir: Annotated[Literal["asc", "desc"], Query()] = "desc",
) -> AdminBookingListResponse:
    total, items, summary = await bookings.list_admin_bookings(
        db,
        status=booking_status,
        search=search,
        date_from=date_from,
        date_to=date_to,
        technician_id=technician_id,
        brand_id=brand_id,
        service_id=service_id,
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return AdminBookingListResponse(
        total=total,
        items=[AdminBookingOut.model_validate(i) for i in items],
        summary=summary,
    )


@router.post("/{booking_id}/cancel", response_model=CancelResponse)
@limiter.limit("60/minute")
async def cancel_admin_booking(
    request: Request,
    db: DbDep,
    admin: AdminTwoFaUser,
    booking_id: int,
    payload: CancelRequest,
) -> CancelResponse:
    """Office cancel: no ownership check (office authority); the audit stamp
    records which staffer cancelled. Refund tiers + atomic claim shared."""
    booking = await bookings.get_booking_or_404(db, booking_id)
    result = await bookings.cancel_booking(
        db, booking, admin, payload.reason,
        payload.refund_to_number, payload.refund_to_name,
    )
    return CancelResponse.model_validate(result)
