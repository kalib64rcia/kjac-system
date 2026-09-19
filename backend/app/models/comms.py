"""Communication models: threads, messages, notifications."""

from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import created_at_column, pk_column, updated_at_column

NOTIFICATION_TYPES = (
    "booking_submitted",
    "payment_uploaded",
    "payment_verified",
    "payment_rejected",
    "booking_confirmed",
    "technician_assigned",
    "technician_on_way",
    "technician_arrived",
    "service_started",
    "service_completed",
    "booking_cancelled",
    "booking_expiring",
    "refund_approved",
    "refund_denied",
    "refund_completed",
    "reschedule_approved",
    "reschedule_denied",
    "low_stock_alert",
    "technician_pending_approval",
    "staff_pending_approval",
    "refund_proposed",
    "refund_reviewed",
    "password_reset",
    "account_locked",
    "waitlist_joined",
    "booking_reminder_tomorrow",
    "payment_reminder",
    "booking_scheduled",
    "booking_schedule_withdrawn",
)


class MessageThread(Base):
    __tablename__ = "message_threads"

    id: Mapped[int] = pk_column()
    booking_id: Mapped[int | None] = mapped_column(
        ForeignKey("bookings.id", ondelete="SET NULL")
    )
    participant_user_ids: Mapped[list[int]] = mapped_column(ARRAY(BigInteger()), nullable=False)

    thread_type: Mapped[str] = mapped_column(String(20), nullable=False)

    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_message_preview: Mapped[str | None] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    __table_args__ = (
        CheckConstraint(
            "thread_type IN ('booking_chat', 'general_message')",
            name="chk_threads_type_valid",
        ),
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = pk_column()
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("message_threads.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(String(20), default="text")

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        CheckConstraint(
            "message_type IN ('text', 'system')", name="chk_messages_type_valid"
        ),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = pk_column()
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    booking_id: Mapped[int | None] = mapped_column(
        ForeignKey("bookings.id", ondelete="SET NULL")
    )

    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    sent_via_push: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_via_email: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        CheckConstraint(f"type IN {NOTIFICATION_TYPES}", name="chk_notifications_type_valid"),
    )
