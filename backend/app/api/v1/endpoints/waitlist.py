"""Guest waitlist for full days (public join; office list/offer/remove)."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, Request, status

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.schemas.booking import (
    WaitlistJoin,
    WaitlistOffer,
    WaitlistOfferResponse,
    WaitlistOut,
)
from app.services import booking_service as bookings
from app.services.turnstile_service import verify_turnstile

router = APIRouter(prefix="/waitlist", tags=["waitlist"])
admin_router = APIRouter(prefix="/admin/waitlist", tags=["admin-waitlist"])


@router.post("", response_model=WaitlistOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def join_waitlist(
    request: Request, payload: WaitlistJoin, db: DbDep
) -> WaitlistOut:
    client_ip = request.client.host if request.client else None
    if not verify_turnstile(payload.turnstile_token, client_ip):
        raise AppError("VAL_003", "CAPTCHA verification failed.", 400)
    row = await bookings.join_waitlist(
        db,
        day=payload.preferred_date,
        name=payload.name,
        phone=payload.phone,
        email=str(payload.email),
    )
    return WaitlistOut.model_validate(row)


@admin_router.get("", response_model=list[WaitlistOut])
@limiter.limit("300/minute")
async def list_waitlist(
    request: Request,
    db: DbDep,
    admin: AdminTwoFaUser,
    day: Annotated[date, Query()],
) -> list[WaitlistOut]:
    rows = await bookings.list_waitlist(db, day)
    return [WaitlistOut.model_validate(r) for r in rows]


@admin_router.post("/{entry_id}/offer", response_model=WaitlistOfferResponse)
@limiter.limit("60/minute")
async def offer_waitlist_slot(
    request: Request,
    db: DbDep,
    admin: AdminTwoFaUser,
    entry_id: int,
    payload: WaitlistOffer,
) -> WaitlistOfferResponse:
    from app.models.bookings import BookingHold

    entry, link = await bookings.offer_waitlist_slot(
        db, entry_id=entry_id, slot=payload.preferred_time
    )
    hold = await db.get(BookingHold, entry.offer_hold_id)
    if hold is None:
        raise AppError("BOOKING_005", "Offer hold went missing.", 500)
    return WaitlistOfferResponse(
        entry=WaitlistOut.model_validate(entry),
        booking_link=link,
        hold_expires_at=hold.expires_at,
    )


@admin_router.post("/{entry_id}/remove", response_model=WaitlistOut)
@limiter.limit("60/minute")
async def remove_waitlist_entry(
    request: Request, db: DbDep, admin: AdminTwoFaUser, entry_id: int
) -> WaitlistOut:
    row = await bookings.remove_waitlist_entry(db, entry_id)
    return WaitlistOut.model_validate(row)
