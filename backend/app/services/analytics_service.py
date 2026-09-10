"""Dashboard aggregates: today, this month, and 3 charts.

Revenue = verified payments (created_at dating). Appointments today =
non-terminal bookings on today's preferred_date. Active technicians =
distinct techs on confirmed/ongoing jobs today.
"""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bookings import Booking
from app.models.catalog import Service
from app.models.financial import Payment
from app.models.users import User


def _month_starts(today: date, n: int) -> list[date]:
    starts = []
    year, month = today.year, today.month
    for _ in range(n):
        starts.append(date(year, month, 1))
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return list(reversed(starts))


def _month_key(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


async def dashboard(db: AsyncSession, now: datetime) -> dict:
    today = now.astimezone(UTC).date() if now.tzinfo else now.date()
    month_start = today.replace(day=1)

    todays = (
        await db.execute(
            select(func.count(Booking.id)).where(
                Booking.preferred_date == today,
                Booking.status.notin_(("cancelled", "expired")),
                Booking.deleted_at.is_(None),
            )
        )
    ).scalar_one()
    pending = (
        await db.execute(
            select(func.count(Booking.id)).where(
                Booking.status == "pending", Booking.deleted_at.is_(None)
            )
        )
    ).scalar_one()
    active_techs = (
        await db.execute(
            select(func.count(func.distinct(Booking.technician_id))).where(
                Booking.preferred_date == today,
                Booking.status.in_(("confirmed", "ongoing")),
                Booking.technician_id.is_not(None),
                Booking.deleted_at.is_(None),
            )
        )
    ).scalar_one()
    revenue_today = (
        await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.status == "verified", func.date(Payment.created_at) == today
            )
        )
    ).scalar_one()

    month_q = [Booking.deleted_at.is_(None), func.date(Booking.created_at) >= month_start]
    month_total = (
        await db.execute(select(func.count(Booking.id)).where(*month_q))
    ).scalar_one()
    month_completed = (
        await db.execute(
            select(func.count(Booking.id)).where(*month_q, Booking.status == "completed")
        )
    ).scalar_one()
    month_cancelled = (
        await db.execute(
            select(func.count(Booking.id)).where(*month_q, Booking.status == "cancelled")
        )
    ).scalar_one()
    month_revenue = (
        await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.status == "verified",
                func.date(Payment.created_at) >= month_start,
            )
        )
    ).scalar_one()
    new_customers = (
        await db.execute(
            select(func.count(User.id)).where(
                User.role == "customer",
                User.deleted_at.is_(None),
                func.date(User.created_at) >= month_start,
            )
        )
    ).scalar_one()

    revenue_by_month = []
    for start in _month_starts(today, 12):
        end = (start + timedelta(days=32)).replace(day=1)
        total = (
            await db.execute(
                select(func.coalesce(func.sum(Payment.amount), 0)).where(
                    Payment.status == "verified",
                    func.date(Payment.created_at) >= start,
                    func.date(Payment.created_at) < end,
                )
            )
        ).scalar_one()
        revenue_by_month.append({"month": _month_key(start), "total": float(total)})

    by_service = (
        await db.execute(
            select(Service.name, func.count(Booking.id))
            .join(Booking, Booking.service_id == Service.id)
            .where(Booking.deleted_at.is_(None))
            .group_by(Service.name)
            .order_by(Service.name)
        )
    ).all()

    growth = []
    for start in _month_starts(today, 6):
        end = (start + timedelta(days=32)).replace(day=1)
        count = (
            await db.execute(
                select(func.count(User.id)).where(
                    User.role == "customer",
                    User.deleted_at.is_(None),
                    func.date(User.created_at) >= start,
                    func.date(User.created_at) < end,
                )
            )
        ).scalar_one()
        growth.append({"month": _month_key(start), "new_customers": count})

    return {
        "today": {
            "appointments": todays,
            "pending_bookings": pending,
            "active_technicians": active_techs,
            "revenue": float(revenue_today),
        },
        "this_month": {
            "total_bookings": month_total,
            "completed_bookings": month_completed,
            "cancelled_bookings": month_cancelled,
            "revenue": float(month_revenue),
            "new_customers": new_customers,
        },
        "charts": {
            "revenue_by_month": revenue_by_month,
            "bookings_by_service": [
                {"service": name, "count": count} for name, count in by_service
            ],
            "customer_growth": growth,
        },
    }
