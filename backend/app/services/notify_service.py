"""In-app notification writer + best-effort fan-out.

Row insert is the source of truth (push/email consumers read it later).
Fan-out is best-effort and never breaks the calling transaction: email goes
through the configured SMTP relay for major lifecycle events; push is logged
until Firebase credentials are provisioned (see CONTRACTS.md Phase 4).
"""

import logging

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comms import Notification
from app.models.users import User

logger = logging.getLogger(__name__)

EMAIL_TYPES = {
    "booking_confirmed", "booking_scheduled", "payment_verified", "payment_rejected",
    "service_completed", "booking_cancelled", "refund_approved",
    "refund_denied", "refund_completed", "reschedule_approved",
    "reschedule_denied",
}

PUSH_TYPES = {
    "technician_assigned", "technician_on_way", "technician_arrived",
    "service_started", "booking_expiring", "low_stock_alert",
    "technician_pending_approval",
}


async def notify(
    db: AsyncSession,
    user_id: int,
    type: str,
    title: str,
    message: str,
    booking_id: int | None = None,
) -> Notification:
    row = Notification(
        user_id=user_id, booking_id=booking_id, type=type, title=title, message=message
    )
    db.add(row)
    await db.flush()
    await _fan_out(db, row)
    return row


async def _fan_out(db: AsyncSession, row: Notification) -> None:
    try:
        user = await db.get(User, row.user_id)
    except SQLAlchemyError as exc:  # address lookup must not break callers
        logger.warning("notification address lookup failed: %s", exc)
        return
    email = user.email if user is not None else None
    if row.type in EMAIL_TYPES and email:
        from app.services.email_service import EmailService

        row.sent_via_email = EmailService().send(email, f"KJAC: {row.title}", row.message)
    if row.type in PUSH_TYPES:
        # TODO: Firebase Admin SDK once service-account JSON is provisioned.
        logger.info("push queued for user %s: [%s] %s", row.user_id, row.type, row.title)
        row.sent_via_push = False
