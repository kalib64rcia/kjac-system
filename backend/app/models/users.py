"""User models — Supabase Auth only (CONTRACTS.md C1/C2).

No password_hash / remember_token / two_factor_secret: identity comes from
Supabase JWTs. Admin 2FA uses short-lived email codes (AdminTwoFaCode).
"""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import (
    created_at_column,
    deleted_at_column,
    pk_column,
    updated_at_column,
)

USER_ROLES = ("admin", "customer", "technician")
USER_STATUSES = ("active", "inactive", "suspended", "pending_approval")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = pk_column()
    # Nullable until first Supabase sync links the row (Phase 5 invite flow).
    # No Python-side default: explicit None must stay NULL (defaults fire on
    # None at INSERT). All creators supply uuid or None deliberately.
    uuid: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), unique=True, nullable=True
    )

    first_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    phone: Mapped[str] = mapped_column(String(25))

    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    phone_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    role: Mapped[str] = mapped_column(String(20), default="customer")
    status: Mapped[str] = mapped_column(String(20), default="active")

    profile_picture_url: Mapped[str | None] = mapped_column(Text)
    date_of_birth: Mapped[date | None] = mapped_column(Date)

    region_code: Mapped[str | None] = mapped_column(String(20))
    province_code: Mapped[str | None] = mapped_column(String(20))
    city_municipality_code: Mapped[str | None] = mapped_column(String(20))
    barangay_code: Mapped[str | None] = mapped_column(String(20))
    street_address: Mapped[str | None] = mapped_column(Text)
    landmark: Mapped[str | None] = mapped_column(String(255))
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8))
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8))

    total_jobs_completed: Mapped[int] = mapped_column(default=0)
    average_rating: Mapped[float] = mapped_column(Numeric(3, 2), default=0.00)

    # Email-code 2FA flag (no TOTP secret — CONTRACTS.md C2)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_ip: Mapped[str | None] = mapped_column(String(45))

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()
    deleted_at: Mapped[datetime | None] = deleted_at_column()

    __table_args__ = (
        CheckConstraint(f"role IN {USER_ROLES}", name="chk_users_role_valid"),
        CheckConstraint(f"status IN {USER_STATUSES}", name="chk_users_status_valid"),
        CheckConstraint("average_rating >= 0 AND average_rating <= 5", name="chk_users_rating_range"),
    )


class UserSession(Base):
    """Supabase refresh-token sessions + device/FCM tracking."""

    __tablename__ = "user_sessions"

    id: Mapped[int] = pk_column()
    user_id: Mapped[int] = mapped_column(nullable=False)

    refresh_token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    device_name: Mapped[str | None] = mapped_column(String(100))
    device_type: Mapped[str | None] = mapped_column(String(20))

    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(Text)
    fcm_token: Mapped[str | None] = mapped_column(Text)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        CheckConstraint("device_type IN ('web', 'ios', 'android')", name="chk_sessions_device_type"),
    )


class AdminTwoFaCode(Base):
    """Short-lived email 2FA codes for admin login (CONTRACTS.md C2)."""

    __tablename__ = "admin_two_fa_codes"

    id: Mapped[int] = pk_column()
    user_id: Mapped[int] = mapped_column(nullable=False)

    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(default=0)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = created_at_column()
