"""Customer ratings: one per booking, completed bookings only.

The technician average is maintained by the DB trigger (INSERT/UPDATE/DELETE
covered, migration d4e5f60004); the service only enforces eligibility.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.financial import Rating
from app.models.users import User
from app.services.booking_service import assert_owner, get_booking_or_404
from app.services.notify_service import notify


async def create_rating(
    db: AsyncSession, booking_id: int, user: User | None,
    guest_email: str | None, rating: int, review_text: str | None,
) -> Rating:
    booking = await get_booking_or_404(db, booking_id)
    assert_owner(booking, user, guest_email)
    if booking.status != "completed":
        raise AppError("BOOKING_003", "Only completed bookings can be rated.", 409)
    if booking.technician_id is None:
        raise AppError("BOOKING_003", "No technician assigned to rate.", 409)
    existing = await db.execute(
        select(Rating.id).where(
            Rating.booking_id == booking.id, Rating.deleted_at.is_(None)
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise AppError("BOOKING_003", "This booking is already rated.", 409)

    customer_id = user.id if user is not None else booking.customer_id
    if customer_id is None:
        raise AppError("BOOKING_003", "Account required to submit a rating.", 400)
    row = Rating(
        booking_id=booking.id, customer_id=customer_id,
        technician_id=booking.technician_id, rating=rating, review_text=review_text,
    )
    db.add(row)
    await db.flush()
    await notify(
        db, booking.technician_id, "service_completed", "New rating received",
        f"{booking.reference_id} rated {rating}/5.", booking.id,
    )
    await db.commit()
    await db.refresh(row)
    return row


async def technician_ratings(
    db: AsyncSession, technician_id: int, page: int, limit: int
) -> tuple[float, int, list[Rating]]:
    tech = await db.get(User, technician_id)
    if tech is None or tech.role != "technician" or tech.deleted_at is not None:
        raise AppError("BOOKING_005", "Technician not found.", 404)
    total = (
        await db.execute(
            select(func.count(Rating.id)).where(
                Rating.technician_id == technician_id, Rating.deleted_at.is_(None)
            )
        )
    ).scalar_one()
    rows = (
        await db.execute(
            select(Rating)
            .where(Rating.technician_id == technician_id, Rating.deleted_at.is_(None))
            .order_by(Rating.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).scalars()
    return float(tech.average_rating or 0), total, list(rows)


async def delete_rating(db: AsyncSession, rating_id: int) -> None:
    """Admin soft-delete (flagged/inappropriate review); trigger recalcs avg."""
    from datetime import UTC, datetime

    row = await db.get(Rating, rating_id)
    if row is None or row.deleted_at is not None:
        raise AppError("BOOKING_001", "Rating not found.", 404)
    row.deleted_at = datetime.now(UTC)
    await db.commit()
