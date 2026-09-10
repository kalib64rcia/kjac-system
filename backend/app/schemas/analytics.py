"""Analytics schemas (concrete chart item shapes)."""

from pydantic import BaseModel


class TodayStats(BaseModel):
    appointments: int
    pending_bookings: int
    active_technicians: int
    revenue: float


class MonthStats(BaseModel):
    total_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    revenue: float
    new_customers: int


class MonthPoint(BaseModel):
    month: str
    total: float


class ServicePoint(BaseModel):
    service: str
    count: int


class GrowthPoint(BaseModel):
    month: str
    new_customers: int


class Charts(BaseModel):
    revenue_by_month: list[MonthPoint] = []
    bookings_by_service: list[ServicePoint] = []
    customer_growth: list[GrowthPoint] = []


class DashboardResponse(BaseModel):
    today: TodayStats
    this_month: MonthStats
    charts: Charts
