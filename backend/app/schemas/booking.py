"""Booking schemas (Pydantic v2). Server re-validates everything (ARCHITECTURE)."""

import re
from datetime import date, datetime, time
from datetime import time as time_type

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

PHONE_RE = re.compile(r"^(09|\+639)\d{9}$")


class BookingCreate(BaseModel):
    customer_first_name: str = Field(min_length=1, max_length=100)
    customer_last_name: str = Field(min_length=1, max_length=100)
    customer_email: EmailStr
    customer_phone: str = Field(min_length=9, max_length=25)

    region_code: str = Field(min_length=1, max_length=20)
    province_code: str = Field(min_length=1, max_length=20)
    city_municipality_code: str = Field(min_length=1, max_length=20)
    barangay_code: str = Field(min_length=1, max_length=20)
    street_address: str = Field(min_length=5, max_length=500)
    landmark: str = Field(min_length=1, max_length=255)

    service_id: int = Field(gt=0)
    brand_id: int = Field(gt=0)
    preferred_date: date
    preferred_time: time

    problem_description: str | None = Field(default=None, max_length=1000)
    turnstile_token: str | None = None

    @field_validator("customer_phone")
    @classmethod
    def phone_format(cls, value: str) -> str:
        if not PHONE_RE.match(value):
            raise ValueError("Use 09XXXXXXXXX or +639XXXXXXXXX")
        return value


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_id: str
    status: str
    customer_first_name: str
    customer_last_name: str
    customer_email: str
    customer_phone: str
    service_id: int
    brand_id: int
    preferred_date: date
    preferred_time: time_type
    down_payment_amount: float
    total_service_cost: float | None = None
    expires_at: datetime | None = None


class TrackResponse(BaseModel):
    """Public tracking view: masked PII (CONTRACTS.md R1)."""

    reference_id: str
    status: str
    customer_name: str
    service_id: int
    brand_id: int
    preferred_date: date
    preferred_time: time_type
    area_barangay: str | None = None
    area_city: str | None = None
    masked_phone: str
    technician_name: str | None = None
    technician_rating: float | None = None
    down_payment_amount: float
    expires_at: datetime | None = None
    timeline: list[dict] = Field(default_factory=list)


class BookingListResponse(BaseModel):
    total: int
    items: list[BookingResponse]


class CancelRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)
    email: EmailStr | None = None  # guest proof when unauthenticated


class CancelResponse(BaseModel):
    booking_id: int
    status: str
    refund_status: str
    refund_amount: float


class RescheduleRequest(BaseModel):
    new_preferred_date: date
    new_preferred_time: time
    reason: str = Field(min_length=3, max_length=1000)
    email: EmailStr | None = None  # guest proof when unauthenticated


class RescheduleResponse(BaseModel):
    reschedule_id: int
    status: str


class RescheduleReview(BaseModel):
    action: str = Field(pattern=r"^(approve|deny)$")
    admin_notes: str | None = Field(default=None, max_length=1000)


class AssignTechnicianRequest(BaseModel):
    technician_id: int = Field(gt=0)


class TechStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(on_the_way|arrived|ongoing|completed)$")


class AssignResponse(BaseModel):
    booking_id: int
    technician_id: int | None = None
    status: str


class ReviewResponse(BaseModel):
    reschedule_id: int
    status: str


class ExpireResponse(BaseModel):
    expired_count: int
