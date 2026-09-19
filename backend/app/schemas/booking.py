"""Booking schemas (Pydantic v2). Server re-validates everything (ARCHITECTURE)."""

import re
from datetime import date, datetime, time
from datetime import time as time_type
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, ValidationInfo, field_validator

PHONE_RE = re.compile(r"^(09|\+639)\d{9}$")


class BookingCreate(BaseModel):
    customer_first_name: str = Field(min_length=1, max_length=100)
    customer_last_name: str = Field(min_length=1, max_length=100)
    customer_email: EmailStr
    customer_phone: str = Field(min_length=9, max_length=25)

    region_code: str = Field(min_length=1, max_length=20)
    # Childless levels send "" (e.g. NCR has no provinces); the service
    # only accepts an empty province when the region truly has none.
    province_code: str = Field(default="", max_length=20)
    city_municipality_code: str = Field(default="", max_length=20)
    barangay_code: str = Field(default="", max_length=20)
    street_address: str = Field(min_length=5, max_length=500)
    landmark: str = Field(min_length=1, max_length=255)

    service_id: int = Field(gt=0)
    brand_id: int = Field(gt=0)
    preferred_date: date
    preferred_time: time | None = None
    # Seat-hold token from POST /slots/holds (optional; submit still guarded).
    hold_token: str | None = Field(default=None, max_length=100)
    # Hybrid window booking: "morning" | "afternoon" (anchor hour in
    # preferred_time, office places the exact hour). None = exact booking.
    flex_window: str | None = Field(default=None, max_length=20)

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
    original_preferred_date: date | None = None  # Customer's original preferred date
    preferred_time: time_type | None = None  # None for flex window bookings (office sets time later)
    down_payment_amount: float
    total_service_cost: float | None = None
    expires_at: datetime | None = None


class TrackResponse(BaseModel):
    """Public tracking view: masked PII (CONTRACTS.md R1)."""

    booking_id: int  # lets returning guests upload/cancel (email already proven)
    reference_id: str
    status: str
    customer_name: str
    service_id: int
    brand_id: int
    preferred_date: date
    preferred_time: time_type | None = None  # None for flex window bookings
    area_barangay: str | None = None
    area_city: str | None = None
    masked_phone: str
    technician_name: str | None = None
    technician_rating: float | None = None
    down_payment_amount: float
    expires_at: datetime | None = None
    timeline: list[dict] = Field(default_factory=list)
    has_payment: bool = False
    payment_status: str | None = None
    rejection_reason: str | None = None
    refund_status: str | None = None
    refund_amount: float | None = None
    refund_to_masked: str | None = None
    payout_reference_number: str | None = None


class BookingListResponse(BaseModel):
    total: int
    items: list[BookingResponse]


class CancelRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)
    email: EmailStr | None = None  # guest proof when unauthenticated
    refund_to_number: str | None = Field(default=None, max_length=25)
    refund_to_name: str | None = Field(default=None, max_length=100)


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
    # Optimistic claim: the assignment the caller saw. Mismatch means another
    # staffer just changed it — the server answers 409 instead of overwriting.
    expected_technician_id: int | None = Field(default=None, gt=0)
    # Crew: lead technician_id plus 0..5 extra members (1..6 total, solo ok).
    crew_ids: list[int] | None = Field(default=None, max_length=5)


class TechStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(on_the_way|arrived|ongoing|completed)$")


class AssignResponse(BaseModel):
    booking_id: int
    technician_id: int | None = None
    status: str


class ReviewResponse(BaseModel):
    reschedule_id: int
    status: str


class ScheduleRequest(BaseModel):
    """Request to place a booking on the schedule (admin action)."""
    preferred_date: date
    preferred_time: time
    # Optional: explicitly set duration for this booking (in minutes)
    duration_minutes: int | None = Field(default=None, ge=15, le=480)


class ScheduleResponse(BaseModel):
    """Response after successfully proposing a booking schedule."""
    booking_id: int
    status: str
    proposed_at: datetime
    preferred_date: date
    preferred_time: time


class ExpireResponse(BaseModel):
    expired_count: int


class AdminBookingTech(BaseModel):
    id: int
    name: str
    rating: float | None = None


class AdminBookingPayment(BaseModel):
    id: int
    uuid: UUID | None = None
    status: str
    amount: float
    gcash_reference_number: str | None = None
    submitted_at: datetime | None = None
    uuid: UUID | None = None


class AdminBookingReschedule(BaseModel):
    id: int
    old_date: date
    old_time: time_type
    new_date: date
    new_time: time_type
    reason: str


class AdminBookingTimeline(BaseModel):
    old_status: str | None = None
    new_status: str
    at: datetime | None = None
    note: str | None = None


class AdminBookingAddress(BaseModel):
    """Area split per location level (detail sheet rows, table column)."""

    street: str | None = None
    barangay: str | None = None
    city: str | None = None
    province: str | None = None
    region: str | None = None


class AdminBookingRefund(BaseModel):
    status: str
    refund_amount: float
    refund_to_number: str | None = None
    refund_to_name: str | None = None


class AdminBookingOut(BookingResponse):
    technician_id: int | None = None
    flex_window: str | None = None
    dispatch_order: int | None = None
    technician: AdminBookingTech | None = None
    service_name: str | None = None
    service_estimated_duration_minutes: int | None = None
    estimated_duration_minutes: int | None = None  # Admin-set duration override for this booking
    brand_name: str | None = None
    brand_is_partner: bool = False
    address_text: str | None = None
    address_parts: AdminBookingAddress | None = None
    landmark: str | None = None
    payment: AdminBookingPayment | None = None
    active_reschedule: AdminBookingReschedule | None = None
    timeline: list[AdminBookingTimeline] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    cancellation_reason: str | None = None
    refund: AdminBookingRefund | None = None


class AdminBookingListResponse(BaseModel):
    total: int
    items: list[AdminBookingOut]
    summary: dict[str, int] = Field(default_factory=dict)


class SlotHoldRequest(BaseModel):
    preferred_date: date
    preferred_time: time


class SlotHoldResponse(BaseModel):
    reference: str
    hold_token: str
    expires_at: datetime


class SetSlotRequest(BaseModel):
    preferred_date: date
    preferred_time: time
    estimated_duration_minutes: int | None = None  # Optional duration for multi-hour bookings


class SetSlotResponse(BaseModel):
    booking_id: int
    preferred_date: date
    preferred_time: time
    flex_window: str | None = None


class DayOrderIn(BaseModel):
    preferred_date: date
    ordered_ids: list[int] = Field(default_factory=list)


class DayOrderOut(BaseModel):
    preferred_date: date
    ordered_ids: list[int]


class SlotAvailability(BaseModel):
    """One slot, public shape: state only, never counts (privacy P1–P3)."""

    time: str  # "HH:MM"
    state: str  # open | low | full | closed


class DayAvailability(BaseModel):
    date: date
    slots: list[SlotAvailability]


class AvailabilityResponse(BaseModel):
    days: list[DayAvailability]


class VacancySlot(BaseModel):
    """One slot, office shape: state plus the numbers behind it."""

    time: str  # "HH:MM"
    state: str  # open | low | full | closed
    capacity: int
    booked: int
    holds: int
    left: int


class VacancyDay(BaseModel):
    date: date
    slots: list[VacancySlot]


class VacancyResponse(BaseModel):
    days: list[VacancyDay]


class WaitlistJoin(BaseModel):
    preferred_date: date
    name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=9, max_length=25)
    # Required: the offer arrives as an emailed booking link (no SMS channel).
    email: EmailStr
    turnstile_token: str | None = None

    @field_validator("phone")
    @classmethod
    def phone_format(cls, value: str) -> str:
        if not PHONE_RE.match(value):
            raise ValueError("Use 09XXXXXXXXX or +639XXXXXXXXX")
        return value


class WaitlistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    preferred_date: date
    name: str
    phone: str
    email: str | None
    status: str


class WaitlistOffer(BaseModel):
    preferred_time: time


class WaitlistOfferResponse(BaseModel):
    entry: WaitlistOut
    booking_link: str
    hold_expires_at: datetime


class ReminderRunResponse(BaseModel):
    tomorrow_sent: int
    payment_sent: int


class WindowCloseIn(BaseModel):
    preferred_date: date
    window: str = Field(pattern=r"^(morning|afternoon|anytime)$")
    reason: str | None = Field(default=None, max_length=500)


class WindowCloseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    preferred_date: date
    window: str
    reason: str | None = None


class RosterLeaveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date_from: date
    date_to: date
    reason: str | None = None


class RosterTechOut(BaseModel):
    user_id: int
    name: str
    days: list[bool]  # Mon..Sun working flags
    leave: list[RosterLeaveOut] = Field(default_factory=list)


class SetWorkdays(BaseModel):
    days: list[bool] = Field(min_length=7, max_length=7)


class TimeOffIn(BaseModel):
    user_id: int = Field(gt=0)
    date_from: date
    date_to: date
    reason: str | None = Field(default=None, max_length=500)

    @field_validator("date_to")
    @classmethod
    def range_valid(cls, value: date, info: ValidationInfo) -> date:
        if info.data.get("date_from") is not None and value < info.data["date_from"]:
            raise ValueError("date_to must not precede date_from")
        return value
