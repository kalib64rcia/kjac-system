"""Office reminders: one manual pass of guest nudges.

Toggles live in system_settings (reminder_booking_tomorrow_enabled,
reminder_payment_expiring_enabled). The runner (db cron) calls the same
service; this endpoint is the manual trigger + the offline fallback.
"""

from fastapi import APIRouter, Request

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.rate_limit import limiter
from app.schemas.booking import ReminderRunResponse
from app.services import booking_service as bookings

router = APIRouter(prefix="/admin/reminders", tags=["admin-reminders"])


@router.post("/run", response_model=ReminderRunResponse)
@limiter.limit("10/minute")
async def run_reminders(
    request: Request, db: DbDep, admin: AdminTwoFaUser
) -> ReminderRunResponse:
    result = await bookings.run_reminders(db)
    return ReminderRunResponse.model_validate(result)
