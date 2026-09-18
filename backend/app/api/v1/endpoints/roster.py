"""Office roster: who works which days + time off (Phase D)."""

from fastapi import APIRouter, Request, status

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.rate_limit import limiter
from app.schemas.booking import (
    RosterLeaveOut,
    RosterTechOut,
    SetWorkdays,
    TimeOffIn,
)
from app.services import booking_service as bookings

router = APIRouter(prefix="/admin/roster", tags=["admin-roster"])


@router.get("", response_model=list[RosterTechOut])
@limiter.limit("300/minute")
async def get_roster(
    request: Request, db: DbDep, admin: AdminTwoFaUser
) -> list[RosterTechOut]:
    rows = await bookings.get_roster(db)
    return [RosterTechOut.model_validate(r) for r in rows]


@router.put("/{user_id}/days", response_model=RosterTechOut)
@limiter.limit("60/minute")
async def set_workdays(
    request: Request,
    db: DbDep,
    admin: AdminTwoFaUser,
    user_id: int,
    payload: SetWorkdays,
) -> RosterTechOut:
    row = await bookings.set_workdays(db, user_id, payload.days)
    return RosterTechOut.model_validate(row)


@router.post("/time-off", response_model=RosterLeaveOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def add_time_off(
    request: Request, db: DbDep, admin: AdminTwoFaUser, payload: TimeOffIn
) -> RosterLeaveOut:
    row = await bookings.add_time_off(
        db,
        user_id=payload.user_id,
        date_from=payload.date_from,
        date_to=payload.date_to,
        reason=payload.reason,
    )
    return RosterLeaveOut.model_validate(row)


@router.delete("/time-off/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def delete_time_off(
    request: Request, db: DbDep, admin: AdminTwoFaUser, leave_id: int
) -> None:
    await bookings.delete_time_off(db, leave_id)
