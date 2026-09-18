"""Booking models — customer_id nullable for guest walk-ins (CONTRACTS.md U1)."""

from datetime import date, datetime
from datetime import time as time_type

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import created_at_column, deleted_at_column, pk_column, updated_at_column

BOOKING_STATUSES = (
    "submitted",      # Customer submits service request
    "proposed",       # Admin proposes exact date/time
    "scheduled",      # Customer accepts proposed time, awaiting payment
    "confirmed",      # Payment verified
    "assigned",       # Technician assigned
    "ongoing",        # Service in progress
    "completed",      # Service finished
    "cancelled",      # Cancelled by admin/customer
    "expired",        # Never paid in time
    "rescheduled",    # Rescheduled by customer
    "alternative_proposed",  # Alternative time proposed (for rescheduled bookings)
    "awaiting_payment",  # Legacy - can be removed after migration
)


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = pk_column()
    reference_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Nullable: guest walk-ins have no user row (CONTRACTS.md U1)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    technician_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="RESTRICT"), nullable=False
    )
    brand_id: Mapped[int] = mapped_column(
        ForeignKey("aircon_brands.id", ondelete="RESTRICT"), nullable=False
    )

    customer_first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(25), nullable=False)

    region_code: Mapped[str | None] = mapped_column(String(20))
    province_code: Mapped[str | None] = mapped_column(String(20))
    city_municipality_code: Mapped[str | None] = mapped_column(String(20))
    barangay_code: Mapped[str | None] = mapped_column(String(20))
    street_address: Mapped[str] = mapped_column(Text, nullable=False)
    landmark: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8))
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8))

    preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    original_preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    preferred_time: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    # Admin-set duration override (for when set-slot is called with explicit duration)
    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer)
    # Window booking (hybrid): morning/afternoon anchor in preferred_time,
    # office places the exact hour later. NULL = exact booking as before.
    flex_window: Mapped[str | None] = mapped_column(Text)
    problem_description: Mapped[str | None] = mapped_column(Text)
    aircon_photos: Mapped[list[str] | None] = mapped_column(ARRAY(Text))

    down_payment_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_service_cost: Mapped[float | None] = mapped_column(Numeric(10, 2))

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="submitted")

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )
    proposed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    ongoing_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    payment_reminder_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    # Manual day-plan order (office up/down arrows, Sta Cruz before
    # Cavinti). NULL = unordered, sorts by preferred_time.
    dispatch_order: Mapped[int | None] = mapped_column(Integer)

    cancellation_reason: Mapped[str | None] = mapped_column(Text)
    cancelled_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    admin_notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()
    deleted_at: Mapped[datetime | None] = deleted_at_column()

    __table_args__ = (
        CheckConstraint(
            r"reference_id ~ '^KJAC-\d{4}-[A-Z0-9]{6}$'", name="chk_bookings_reference_format"
        ),
        CheckConstraint("down_payment_amount >= 0", name="chk_bookings_down_payment"),
        CheckConstraint("total_service_cost >= 0", name="chk_bookings_total_cost"),
        CheckConstraint(f"status IN {BOOKING_STATUSES}", name="chk_bookings_status_valid"),
    )


class BookingStatusHistory(Base):
    __tablename__ = "booking_status_history"

    id: Mapped[int] = pk_column()
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    changed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    old_status: Mapped[str | None] = mapped_column(String(20))
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = created_at_column()


class RescheduleRequest(Base):
    __tablename__ = "reschedule_requests"

    id: Mapped[int] = pk_column()
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    requested_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    reviewed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    old_preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    old_preferred_time: Mapped[time_type] = mapped_column(Time, nullable=False)
    new_preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    new_preferred_time: Mapped[time_type] = mapped_column(Time, nullable=False)

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    admin_notes: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'approved', 'denied')",
            name="chk_reschedule_status_valid",
        ),
    )


class BookingHold(Base):
    """Ephemeral seat hold: guest picked a slot, details not typed yet.

    No customer data, minutes of life, expired rows deleted on write.
    Ownership = unguessable token (sha256 stored, raw shown once).
    """
    __tablename__ = "booking_holds"

    id: Mapped[int] = pk_column()
    reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    preferred_time: Mapped[time_type] = mapped_column(Time, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        Index("idx_booking_holds_slot", "preferred_date", "preferred_time"),
    )


class WindowClosure(Base):
    """Manual FULL per date+window. Closed blocks new submits (409),
    reopen = delete the row. Existing PENDING rows are kept for triage."""

    __tablename__ = "window_closures"

    id: Mapped[int] = pk_column()
    preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    window: Mapped[str] = mapped_column(String(20), nullable=False)
    closed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        UniqueConstraint(
            "preferred_date", "window", name="uq_window_closures_day_window"
        ),
        CheckConstraint(
            '"window" IN (\'morning\', \'afternoon\', \'anytime\')',
            name="chk_window_closures_window",
        ),
        Index("idx_window_closures_day", "preferred_date", "window"),
    )


class BookingCrewMember(Base):
    """Crew join: 1..6 names per booking, solo allowed. technician_id on
    bookings stays as lead for backward compat (payroll/reports)."""

    __tablename__ = "booking_crew_members"

    id: Mapped[int] = pk_column()
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        UniqueConstraint(
            "booking_id", "user_id", name="uq_booking_crew_booking_user"
        ),
        Index("idx_booking_crew_booking", "booking_id"),
        Index("idx_booking_crew_user", "user_id"),
    )


class BookingWaitlist(Base):
    """One line per guest waiting on a full day. No account needed.

    Statuses: waiting (in line), offered (office placed an exact hour and
    emailed a booking link backed by a hold), removed (guest gave up or
    office cleared). Past days read as expired without a status write.
    """

    __tablename__ = "booking_waitlist"

    id: Mapped[int] = pk_column()
    preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(String(25), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="waiting")
    offer_hold_id: Mapped[int | None] = mapped_column(
        ForeignKey("booking_holds.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        CheckConstraint(
            "status IN ('waiting', 'offered', 'removed')",
            name="chk_waitlist_status_valid",
        ),
        Index("idx_waitlist_day", "preferred_date", "status"),
    )


class TechnicianWorkday(Base):
    """Weekly template: which weekdays a tech works. No rows = works every
    day (capacity is unchanged until the office touches the roster).
    weekday follows Python: 0 = Monday .. 6 = Sunday.
    """

    __tablename__ = "technician_workdays"

    id: Mapped[int] = pk_column()
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)
    is_working: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        UniqueConstraint("user_id", "weekday", name="uq_tech_workdays_user_day"),
        CheckConstraint(
            "weekday >= 0 AND weekday <= 6",
            name="chk_tech_workdays_weekday",
        ),
        Index("idx_tech_workdays_user", "user_id"),
    )


class TechnicianTimeOff(Base):
    """Leave ranges. Any overlapping row means the tech is out that day —
    leave wins over the template. Cancel = delete the row."""

    __tablename__ = "technician_time_off"

    id: Mapped[int] = pk_column()
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    date_from: Mapped[date] = mapped_column(Date, nullable=False)
    date_to: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        CheckConstraint(
            "date_from <= date_to",
            name="chk_tech_time_off_range",
        ),
        Index("idx_tech_time_off_user", "user_id"),
    )
