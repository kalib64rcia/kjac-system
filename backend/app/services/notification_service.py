"""Notification center reads (owner-scoped)."""

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.comms import Notification


async def list_for_user(
    db: AsyncSession, user_id: int, is_read: bool | None, page: int, limit: int
) -> tuple[int, int, list[Notification]]:
    base = select(Notification).where(Notification.user_id == user_id)
    if is_read is not None:
        base = base.where(Notification.is_read == is_read)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    unread = (
        await db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id, Notification.is_read.is_(False)
            )
        )
    ).scalar_one()
    rows = (
        await db.execute(base.order_by(Notification.id.desc())
                         .offset((page - 1) * limit).limit(limit))
    ).scalars()
    return total, unread, list(rows)


async def mark_read(db: AsyncSession, user_id: int, notification_id: int) -> Notification:
    row = await db.get(Notification, notification_id)
    if row is None or row.user_id != user_id:
        raise AppError("BOOKING_001", "Notification not found.", 404)
    row.is_read = True
    row.read_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(row)
    return row


async def mark_all_read(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        Notification.__table__.update()
        .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        .values(is_read=True, read_at=datetime.now(UTC))
    )
    await db.commit()
    return result.rowcount or 0
