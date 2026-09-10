"""Payroll schemas. Totals are always computed server-side."""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class PayrollGenerate(BaseModel):
    employee_user_id: int = Field(gt=0)
    period_start_date: date
    period_end_date: date
    payment_date: date
    base_salary: float = Field(default=0, ge=0)
    overtime_pay: float = Field(default=0, ge=0)
    bonuses: float = Field(default=0, ge=0)
    other_earnings: float = Field(default=0, ge=0)
    tax_withheld: float = Field(default=0, ge=0)
    sss_contribution: float = Field(default=0, ge=0)
    philhealth_contribution: float = Field(default=0, ge=0)
    pagibig_contribution: float = Field(default=0, ge=0)
    other_deductions: float = Field(default=0, ge=0)
    notes: str | None = Field(default=None, max_length=1000)


class PayrollResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_user_id: int
    period_start_date: date
    period_end_date: date
    payment_date: date
    base_salary: float
    commission: float
    total_earnings: float
    total_deductions: float
    net_pay: float
    status: str
    payment_method: str | None = None


class PayrollListResponse(BaseModel):
    total: int
    items: list[PayrollResponse]


class PayrollTransition(BaseModel):
    action: str = Field(pattern=r"^(approve|pay|cancel)$")
    payment_method: str | None = Field(default=None, pattern=r"^(bank_transfer|cash|gcash)$")
