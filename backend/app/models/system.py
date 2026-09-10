"""System & audit models."""

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import created_at_column, pk_column, updated_at_column


class AuditLog(Base):
    """Immutable audit trail — no UPDATE/DELETE policies (trigger-written)."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = pk_column()
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    table_name: Mapped[str] = mapped_column(String(50), nullable=False)
    record_id: Mapped[int] = mapped_column(nullable=False)
    action: Mapped[str] = mapped_column(String(10), nullable=False)

    old_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    new_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    changed_fields: Mapped[list[str] | None] = mapped_column(ARRAY(Text))

    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(Text)
    request_id: Mapped[str | None] = mapped_column(String(100))

    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        CheckConstraint(
            "action IN ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')",
            name="chk_audit_action_valid",
        ),
    )


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = pk_column()
    setting_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    setting_value: Mapped[str] = mapped_column(Text, nullable=False)
    data_type: Mapped[str] = mapped_column(String(20), nullable=False)

    category: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)

    is_editable: Mapped[bool] = mapped_column(Boolean, default=True)
    validation_rule: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    __table_args__ = (
        CheckConstraint(
            "data_type IN ('string', 'integer', 'boolean', 'json')",
            name="chk_settings_type_valid",
        ),
    )
