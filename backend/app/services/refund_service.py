"""Manual refund propose/approve flow (maker-checker).

Cancellation-policy auto-refunds already exist in booking_service; this covers
discretionary cases (partial, goodwill): office proposes, owner (or delegated
staff) approves + executes or denies with a reason.
"""

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.financial import Refund
from app.models.users import User
from app.services.notify_service import notify


async def _owner_ids(db: AsyncSession) -> list[int]:
    result = await db.execute(
        select(User.id).where(
            User.role == "owner",
            User.status == "active",
            User.deleted_at.is_(None),
        )
    )
    return [row[0] for row in result.all()]


async def propose(
    db: AsyncSession, actor: User, booking_id: int, payment_id: int,
    refund_amount: float, reason: str,
) -> Refund:
    if refund_amount <= 0:
        raise AppError("BOOKING_003", "Refund amount must be positive.", 400)
    from app.models.bookings import Booking
    from app.models.financial import Payment

    booking = await db.get(Booking, booking_id)
    if booking is None or booking.deleted_at is not None:
        raise AppError("BOOKING_001", "Booking not found.", 404)
    payment = await db.get(Payment, payment_id)
    if payment is None or payment.booking_id != booking_id:
        raise AppError("BOOKING_001", "Payment not found for this booking.", 404)
    row = Refund(
        booking_id=booking_id,
        payment_id=payment_id,
        requested_by_user_id=actor.id,
        refund_amount=refund_amount,
        refund_type="manual",
        reason=reason,
        status="proposed",
    )
    db.add(row)
    await db.flush()
    for owner_id in await _owner_ids(db):
        if owner_id != actor.id:
            await notify(
                db, owner_id, "refund_proposed", "Refund proposed",
                f"{actor.first_name} {actor.last_name} proposed ₱{refund_amount:.2f} "
                f"for booking #{booking_id}: {reason}",
                booking_id,
            )
    await db.commit()
    await db.refresh(row)
    return row


async def list_refunds(
    db: AsyncSession, status: str | None, page: int, limit: int,
) -> tuple[int, list[Refund]]:
    query = select(Refund)
    if status:
        query = query.where(Refund.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    rows = (
        await db.execute(
            query.order_by(Refund.id.desc()).offset((page - 1) * limit).limit(limit)
        )
    ).scalars()
    return total, list(rows)


async def review(
    db: AsyncSession, actor: User, refund_id: int, approve: bool,
    admin_notes: str | None, denial_reason: str | None,
) -> Refund:
    row = await db.get(Refund, refund_id)
    if row is None:
        raise AppError("BOOKING_001", "Refund not found.", 404)
    if row.status != "proposed":
        raise AppError("BOOKING_003", "Refund is not awaiting review.", 409)
    if approve:
        row.status = "approved"
        row.processed_by_user_id = actor.id
        row.processed_at = datetime.now(UTC)
        row.admin_notes = admin_notes
    else:
        if not denial_reason:
            raise AppError("BOOKING_003", "A denial reason is required.", 400)
        row.status = "denied"
        row.processed_by_user_id = actor.id
        row.processed_at = datetime.now(UTC)
        row.denial_reason = denial_reason
    if row.requested_by_user_id and row.requested_by_user_id != actor.id:
        await notify(
            db, row.requested_by_user_id, "refund_reviewed",
            "Refund approved" if approve else "Refund denied",
            f"Refund #{row.id} (₱{float(row.refund_amount):.2f}) was "
            f"{'approved' if approve else 'denied'}.",
            row.booking_id,
        )
    await db.commit()
    await db.refresh(row)
    return row
