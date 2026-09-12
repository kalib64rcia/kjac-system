"""Payment, refund, and rating models."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import created_at_column, deleted_at_column, pk_column, updated_at_column


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = pk_column()
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    verified_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    payment_type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(20))

    gcash_reference_number: Mapped[str | None] = mapped_column(String(100))
    gcash_receipt_url: Mapped[str | None] = mapped_column(Text)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    __table_args__ = (
        CheckConstraint(
            "payment_type IN ('down_payment', 'full_payment', 'additional')",
            name="chk_payments_type_valid",
        ),
        CheckConstraint("amount > 0", name="chk_payments_amount_positive"),
        CheckConstraint(
            "payment_method IN ('gcash', 'cash', 'bank_transfer', 'online')",
            name="chk_payments_method_valid",
        ),
        CheckConstraint(
            "status IN ('pending', 'verified', 'rejected')", name="chk_payments_status_valid"
        ),
    )


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[int] = pk_column()
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("payments.id", ondelete="CASCADE"), nullable=False
    )
    requested_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    processed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    refund_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    refund_type: Mapped[str | None] = mapped_column(String(20))

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="processing")

    admin_notes: Mapped[str | None] = mapped_column(Text)
    denial_reason: Mapped[str | None] = mapped_column(Text)

    refund_method: Mapped[str | None] = mapped_column(String(20))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    __table_args__ = (
        CheckConstraint("refund_amount >= 0", name="chk_refunds_amount"),
        CheckConstraint(
            "refund_type IN ('full', 'partial', 'none', 'manual')", name="chk_refunds_type_valid"
        ),
        CheckConstraint(
            "status IN ('proposed', 'processing', 'approved', 'denied', 'completed')",
            name="chk_refunds_status_valid",
        ),
        CheckConstraint(
            "refund_method IN ('gcash', 'bank_transfer', 'cash')",
            name="chk_refunds_method_valid",
        ),
    )


class Rating(Base):
    __tablename__ = "ratings"

    id: Mapped[int] = pk_column()
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    technician_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    review_text: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()
    deleted_at: Mapped[datetime | None] = deleted_at_column()

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="chk_ratings_range"),
    )
