"""Shared column helpers for KJAC models (column order per DATABASE_RULES.md)."""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


def pk_column() -> Mapped[int]:
    return mapped_column(BigInteger, primary_key=True, autoincrement=True)


def uuid_column() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4)


def created_at_column() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))


def updated_at_column() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))


def deleted_at_column() -> Mapped[datetime | None]:
    return mapped_column(DateTime(timezone=True), nullable=True)
