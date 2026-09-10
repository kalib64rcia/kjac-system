"""Payroll: server-computed commission + totals, guarded transitions.

Commission = sum over the tech's completed bookings in the period of the
active rule (service-specific wins, else the global rule; percentage of the
service base price or a fixed amount). Eligibility = completed only; the
"balance settled" refinement from FLOW_PAYROLL is a documented follow-up.
"""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.bookings import Booking
from app.models.catalog import Service
from app.models.hr import CommissionRule, PayrollRecord
from app.models.users import User


async def _active_rule(
    db: AsyncSession, service_id: int, on: date
) -> CommissionRule | None:
    result = await db.execute(
        select(CommissionRule)
        .where(
            CommissionRule.is_active.is_(True),
            CommissionRule.effective_from <= on,
            (CommissionRule.effective_until.is_(None))
            | (CommissionRule.effective_until >= on),
        )
        .order_by(CommissionRule.effective_from.desc())
    )
    rules = list(result.scalars())
    specific = next((r for r in rules if r.service_id == service_id), None)
    if specific is not None:
        return specific
    return next((r for r in rules if r.applies_to_all_services), None)


async def compute_commission(
    db: AsyncSession, technician_id: int, start: date, end: date
) -> float:
    result = await db.execute(
        select(Booking).where(
            Booking.technician_id == technician_id,
            Booking.status == "completed",
            Booking.deleted_at.is_(None),
            func.date(Booking.completed_at) >= start,
            func.date(Booking.completed_at) <= end,
        )
    )
    total = 0.0
    for booking in result.scalars():
        service = await db.get(Service, booking.service_id)
        if service is None:
            continue
        rule = await _active_rule(
            db, booking.service_id, booking.completed_at.date() if booking.completed_at else end
        )
        if rule is None:
            continue
        if rule.commission_type == "percentage":
            total += float(service.base_price) * float(rule.commission_value) / 100
        else:
            total += float(rule.commission_value)
    return round(total, 2)


async def generate_payroll(db: AsyncSession, processed_by: int, **fields) -> PayrollRecord:
    employee = await db.get(User, fields["employee_user_id"])
    if employee is None or employee.deleted_at is not None:
        raise AppError("BOOKING_001", "Employee not found.", 404)
    start, end = fields["period_start_date"], fields["period_end_date"]
    if end < start:
        raise AppError("VAL_001", "Period end must not precede start.", 422)
    overlap = await db.execute(
        select(func.count(PayrollRecord.id)).where(
            PayrollRecord.employee_user_id == employee.id,
            PayrollRecord.status != "cancelled",
            PayrollRecord.period_start_date <= end,
            PayrollRecord.period_end_date >= start,
        )
    )
    if overlap.scalar_one() > 0:
        raise AppError("BOOKING_003", "A payroll already covers this period.", 409)

    commission = await compute_commission(db, employee.id, start, end)
    earnings = (
        fields.get("base_salary", 0) + commission + fields.get("overtime_pay", 0)
        + fields.get("bonuses", 0) + fields.get("other_earnings", 0)
    )
    deductions = (
        fields.get("tax_withheld", 0) + fields.get("sss_contribution", 0)
        + fields.get("philhealth_contribution", 0)
        + fields.get("pagibig_contribution", 0) + fields.get("other_deductions", 0)
    )
    row = PayrollRecord(
        processed_by_user_id=processed_by,
        commission=commission,
        total_earnings=round(earnings, 2),
        total_deductions=round(deductions, 2),
        net_pay=round(earnings - deductions, 2),
        status="pending",
        **{k: v for k, v in fields.items() if k not in ("commission",)},
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def transition_payroll(
    db: AsyncSession, payroll_id: int, action: str, payment_method: str | None
) -> PayrollRecord:
    row = await db.get(PayrollRecord, payroll_id)
    if row is None:
        raise AppError("BOOKING_001", "Payroll record not found.", 404)
    if action == "approve":
        if row.status != "pending":
            raise AppError("BOOKING_003", "Only pending payroll can be approved.", 409)
        row.status = "approved"
    elif action == "pay":
        if row.status != "approved":
            raise AppError("BOOKING_003", "Only approved payroll can be paid.", 409)
        if not payment_method:
            raise AppError("VAL_001", "payment_method is required to pay.", 422)
        row.status = "paid"
        row.payment_method = payment_method
    else:  # cancel
        if row.status == "paid":
            raise AppError("BOOKING_003", "Paid payroll cannot be cancelled.", 409)
        row.status = "cancelled"
    await db.commit()
    await db.refresh(row)
    return row


async def list_payrolls(
    db: AsyncSession, employee_id: int | None, status: str | None,
    page: int, limit: int,
) -> tuple[int, list[PayrollRecord]]:
    query = select(PayrollRecord)
    if employee_id is not None:
        query = query.where(PayrollRecord.employee_user_id == employee_id)
    if status:
        query = query.where(PayrollRecord.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    rows = (
        await db.execute(
            query.order_by(PayrollRecord.id.desc())
            .offset((page - 1) * limit).limit(limit)
        )
    ).scalars()
    return total, list(rows)
