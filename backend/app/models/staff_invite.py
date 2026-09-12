"""Staff invite ledger model (mirrors technician_invites, owner-managed)."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import created_at_column, pk_column


class StaffInvite(Base):
    __tablename__ = "staff_invites"

    id: Mapped[int] = pk_column()
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()

    @property
    def is_live(self) -> bool:
        from datetime import UTC
        from datetime import datetime as dt

        return (
            self.used_at is None
            and self.revoked_at is None
            and self.expires_at.replace(tzinfo=UTC) > dt.now(UTC)
        )
