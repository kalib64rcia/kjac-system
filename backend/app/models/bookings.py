"""Booking models — customer_id nullable for guest walk-ins (CONTRACTS.md U1)."""

from datetime import date, datetime
from datetime import time as time_type

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    Time,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import created_at_column, deleted_at_column, pk_column, updated_at_column

BOOKING_STATUSES = (
    "submitted",
    "pending",
    "confirmed",
    "ongoing",
    "completed",
    "cancelled",
    "expired",
    "rescheduled",
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
    preferred_time: Mapped[time_type] = mapped_column(Time, nullable=False)
    problem_description: Mapped[str | None] = mapped_column(Text)
    aircon_photos: Mapped[list[str] | None] = mapped_column(ARRAY(Text))

    down_payment_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_service_cost: Mapped[float | None] = mapped_column(Numeric(10, 2))

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="submitted")

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )
    pending_at: Mapped[datetime | None] = mapped_column(
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
