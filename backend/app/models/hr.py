"""Payroll & HR models."""

from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import created_at_column, pk_column, updated_at_column


class EmployeeInfo(Base):
    __tablename__ = "employee_info"

    id: Mapped[int] = pk_column()
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    tin: Mapped[str | None] = mapped_column(String(50))
    sss_number: Mapped[str | None] = mapped_column(String(50))
    philhealth_number: Mapped[str | None] = mapped_column(String(50))
    pagibig_number: Mapped[str | None] = mapped_column(String(50))

    bank_name: Mapped[str | None] = mapped_column(String(100))
    bank_account_number: Mapped[str | None] = mapped_column(String(50))
    bank_account_name: Mapped[str | None] = mapped_column(String(200))

    emergency_contact_name: Mapped[str | None] = mapped_column(String(200))
    emergency_contact_relationship: Mapped[str | None] = mapped_column(String(50))
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(25))

    employment_start_date: Mapped[date | None] = mapped_column(Date)
    employment_end_date: Mapped[date | None] = mapped_column(Date)
    employment_status: Mapped[str | None] = mapped_column(String(20))

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    __table_args__ = (
        CheckConstraint(
            "employment_status IN ('active', 'on_leave', 'terminated', 'resigned')",
            name="chk_employee_status_valid",
        ),
    )


class PayrollRecord(Base):
    __tablename__ = "payroll_records"

    id: Mapped[int] = pk_column()
    employee_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    processed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    period_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    period_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)

    base_salary: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    commission: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    overtime_pay: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    bonuses: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    other_earnings: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    total_earnings: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    tax_withheld: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    sss_contribution: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    philhealth_contribution: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    pagibig_contribution: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    other_deductions: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    total_deductions: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    net_pay: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    payment_method: Mapped[str | None] = mapped_column(String(20))

    notes: Mapped[str | None] = mapped_column(Text)
    payslip_url: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'approved', 'paid', 'cancelled')",
            name="chk_payroll_status_valid",
        ),
        CheckConstraint(
            "payment_method IN ('bank_transfer', 'cash', 'gcash')",
            name="chk_payroll_method_valid",
        ),
    )


class CommissionRule(Base):
    __tablename__ = "commission_rules"

    id: Mapped[int] = pk_column()
    service_id: Mapped[int | None] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE")
    )

    commission_type: Mapped[str] = mapped_column(String(20), nullable=False)
    commission_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    applies_to_all_services: Mapped[bool] = mapped_column(Boolean, default=False)

    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_until: Mapped[date | None] = mapped_column(Date)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    __table_args__ = (
        CheckConstraint(
            "commission_type IN ('percentage', 'fixed_amount')",
            name="chk_commission_type_valid",
        ),
    )
