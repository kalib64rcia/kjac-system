"""Public slot availability + seat holds (Phase A scheduling).

States only (open/low/full/closed) — counts never leave the server
(privacy P1–P3). Holds are 10-minute seat locks for guests still typing.
"""

from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.schemas.booking import (
    AvailabilityResponse,
    DayAvailability,
    SlotAvailability,
    SlotHoldRequest,
    SlotHoldResponse,
    VacancyDay,
    VacancyResponse,
    VacancySlot,
    WindowCloseIn,
    WindowCloseOut,
)
from app.services import booking_service as bookings
from app.utils.time_rules import MANILA_TZ

router = APIRouter(prefix="/slots", tags=["slots"])
admin_router = APIRouter(prefix="/admin/slots", tags=["admin-slots"])


@router.get("/availability", response_model=AvailabilityResponse)
@limiter.limit("100/minute")
async def get_availability(
    request: Request,
    db: DbDep,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> AvailabilityResponse:
    today = datetime.now(MANILA_TZ).date()
    start = date_from or today
    end = date_to or today + timedelta(days=30)
    if end < start:
        raise AppError("VAL_001", "date_to must not precede date_from.", 422)
    start = max(start, today)
    end = min(end, today + timedelta(days=30))
    if (end - start).days > 30:
        end = start + timedelta(days=30)
    days = await bookings.availability_range(db, start, end)
    return AvailabilityResponse(
        days=[
            DayAvailability(
                date=d["date"],
                slots=[SlotAvailability(time=s["time"], state=s["state"]) for s in d["slots"]],
            )
            for d in days
        ]
    )


@router.post("/holds", response_model=SlotHoldResponse, status_code=201)
@limiter.limit("10/minute")
async def create_slot_hold(
    request: Request, payload: SlotHoldRequest, db: DbDep
) -> SlotHoldResponse:
    row, token = await bookings.create_hold(
        db, day=payload.preferred_date, slot=payload.preferred_time
    )
    return SlotHoldResponse(
        reference=row.reference, hold_token=token, expires_at=row.expires_at
    )


@admin_router.get("/vacancy", response_model=VacancyResponse)
@limiter.limit("300/minute")
async def get_vacancy(
    request: Request,
    db: DbDep,
    admin: AdminTwoFaUser,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> VacancyResponse:
    today = datetime.now(MANILA_TZ).date()
    start = date_from or today
    end = date_to or today + timedelta(days=30)
    if end < start:
        raise AppError("VAL_001", "date_to must not precede date_from.", 422)
    start = max(start, today)
    end = min(end, today + timedelta(days=30))
    if (end - start).days > 30:
        end = start + timedelta(days=30)
    days = await bookings.vacancy_range(db, start, end)
    return VacancyResponse(
        days=[
            VacancyDay(
                date=d["date"],
                slots=[VacancySlot(**s) for s in d["slots"]],
            )
            for d in days
        ]
    )


@admin_router.post("/close", response_model=WindowCloseOut, status_code=201)
@limiter.limit("60/minute")
async def close_window(
    request: Request,
    db: DbDep,
    admin: AdminTwoFaUser,
    payload: WindowCloseIn,
) -> WindowCloseOut:
    """Manual FULL: block new submits for a date+window. Existing kept."""
    row = await bookings.set_window_closed(
        db, day=payload.preferred_date, window=payload.window,
        closed_by=admin.id, reason=payload.reason,
    )
    return WindowCloseOut.model_validate(row)


@admin_router.post("/reopen", status_code=204)
@limiter.limit("60/minute")
async def reopen_window(
    request: Request,
    db: DbDep,
    admin: AdminTwoFaUser,
    payload: WindowCloseIn,
) -> None:
    await bookings.reopen_window(
        db, day=payload.preferred_date, window=payload.window
    )
