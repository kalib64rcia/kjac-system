"""Admin reports: JSON aggregates + CSV download (PDF is a later phase)."""

import csv
import io
from datetime import date

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.models.bookings import Booking
from app.models.catalog import Service
from app.models.financial import Payment

router = APIRouter(prefix="/admin/reports", tags=["admin-reports"])


async def _booking_rows(db: AsyncSession, date_from: date, date_to: date,
                        status: str | None) -> list[Booking]:
    query = select(Booking).where(
        Booking.deleted_at.is_(None),
        func.date(Booking.created_at) >= date_from,
        func.date(Booking.created_at) <= date_to,
    )
    if status:
        query = query.where(Booking.status == status)
    return list((await db.execute(query.order_by(Booking.id))).scalars())


@router.get("/bookings")
@limiter.limit("60/minute")
async def bookings_report(
    request: Request, db: DbDep, admin: AdminTwoFaUser,
    date_from: date = Query(...), date_to: date = Query(...),  # noqa: B008
    status: str | None = Query(default=None, max_length=20),
    format: str = Query(default="json", pattern=r"^(json|csv)$"),
):
    if date_to < date_from:
        raise AppError("VAL_001", "date_to must not precede date_from.", 422)
    rows = await _booking_rows(db, date_from, date_to, status)
    if format == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["reference_id", "status", "customer_email", "service_id",
                         "preferred_date", "down_payment_amount", "total_service_cost"])
        for booking in rows:
            writer.writerow([booking.reference_id, booking.status, booking.customer_email,
                             booking.service_id, booking.preferred_date,
                             booking.down_payment_amount, booking.total_service_cost])
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]), media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=bookings.csv"},
        )
    return {
        "total": len(rows),
        "items": [
            {"reference_id": b.reference_id, "status": b.status,
             "down_payment_amount": float(b.down_payment_amount)}
            for b in rows
        ],
    }


@router.get("/revenue")
@limiter.limit("60/minute")
async def revenue_report(
    request: Request, db: DbDep, admin: AdminTwoFaUser,
    date_from: date = Query(...), date_to: date = Query(...),  # noqa: B008
):
    """Verified payments grouped by day + totals by service."""
    if date_to < date_from:
        raise AppError("VAL_001", "date_to must not precede date_from.", 422)
    daily = (
        await db.execute(
            select(func.date(Payment.created_at).label("day"),
                   func.sum(Payment.amount).label("total"))
            .where(Payment.status == "verified",
                   func.date(Payment.created_at) >= date_from,
                   func.date(Payment.created_at) <= date_to)
            .group_by(func.date(Payment.created_at))
            .order_by("day")
        )
    ).all()
    by_service = (
        await db.execute(
            select(Service.name, func.sum(Payment.amount).label("total"))
            .join(Booking, Booking.id == Payment.booking_id)
            .join(Service, Service.id == Booking.service_id)
            .where(Payment.status == "verified",
                   func.date(Payment.created_at) >= date_from,
                   func.date(Payment.created_at) <= date_to)
            .group_by(Service.name)
            .order_by(Service.name)
        )
    ).all()
    grand = sum(float(total or 0) for _, total in daily)
    return {
        "grand_total": round(grand, 2),
        "by_day": [{"day": str(day), "total": float(total or 0)} for day, total in daily],
        "by_service": [{"service": name, "total": float(total or 0)}
                       for name, total in by_service],
    }
