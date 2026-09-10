"""Email-code 2FA for admins (CONTRACTS.md C2).

Flow: request (admin, active) -> 6-digit code hashed into admin_two_fa_codes
mailed to the user -> verify (code, 10min TTL, single-use) -> HS256 ticket.

Lockout: >= max failed attempts within the window -> AUTH_002 until the
window slides past the latest failure. Cooldown: 60s between requests.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import create_two_fa_ticket
from app.models.users import AdminTwoFaCode, User
from app.services.email_service import EmailService

CODE_DIGITS = 6


class TwoFaService:
    def __init__(self, db: AsyncSession, mailer: EmailService) -> None:
        self.db = db
        self.mailer = mailer

    @staticmethod
    def _hash(code: str) -> str:
        return hashlib.sha256(code.encode()).hexdigest()

    @staticmethod
    def _window_start(now: datetime) -> datetime:
        return now - timedelta(minutes=settings.login_lockout_minutes)

    async def _failed_attempts(self, user_id: int, now: datetime) -> tuple[int, datetime | None]:
        """(count, latest failure time) inside the lockout window."""
        result = await self.db.execute(
            select(
                func.coalesce(func.sum(AdminTwoFaCode.attempts), 0),
                func.max(AdminTwoFaCode.last_attempt_at),
            ).where(
                AdminTwoFaCode.user_id == user_id,
                AdminTwoFaCode.created_at >= self._window_start(now),
            )
        )
        count, latest = result.one()
        return int(count), latest

    async def _assert_not_locked(self, user_id: int, now: datetime) -> None:
        failed, latest = await self._failed_attempts(user_id, now)
        if failed >= settings.two_fa_max_attempts and latest is not None:
            retry_at = latest + timedelta(minutes=settings.login_lockout_minutes)
            if now < retry_at:
                retry_in = int((retry_at - now).total_seconds())
                raise AppError(
                    "AUTH_002",
                    "Too many wrong codes. Try again later.",
                    429,
                    [{"field": None, "message": f"Retry in {retry_in} seconds"}],
                )

    async def request_code(self, user: User) -> int:
        """Issue a fresh code. Returns TTL minutes. Raises AUTH_006 on cooldown."""
        now = datetime.now(UTC)
        await self._assert_not_locked(user.id, now)

        recent = await self.db.execute(
            select(AdminTwoFaCode)
            .where(
                AdminTwoFaCode.user_id == user.id,
                AdminTwoFaCode.created_at
                >= now - timedelta(seconds=settings.two_fa_resend_cooldown_seconds),
            )
            .order_by(AdminTwoFaCode.id.desc())
            .limit(1)
        )
        if recent.scalar_one_or_none() is not None:
            raise AppError("AUTH_006", "A code was just sent. Wait before retrying.", 429)

        # Invalidate previous unconsumed codes so only the newest works.
        await self.db.execute(
            AdminTwoFaCode.__table__.update()
            .where(
                AdminTwoFaCode.user_id == user.id,
                AdminTwoFaCode.consumed_at.is_(None),
            )
            .values(consumed_at=now)
        )

        code = f"{secrets.randbelow(10**CODE_DIGITS):0{CODE_DIGITS}d}"
        self.db.add(
            AdminTwoFaCode(
                user_id=user.id,
                code_hash=self._hash(code),
                expires_at=now + timedelta(minutes=settings.two_fa_code_ttl_minutes),
            )
        )
        await self.db.commit()
        self.mailer.send_two_fa_code(user.email, code, settings.two_fa_code_ttl_minutes)
        return settings.two_fa_code_ttl_minutes

    async def verify_code(self, user: User, code: str) -> str:
        """Consume a valid code and return a 2FA ticket. Raises AUTH_* on failure."""
        now = datetime.now(UTC)
        await self._assert_not_locked(user.id, now)

        result = await self.db.execute(
            select(AdminTwoFaCode)
            .where(
                AdminTwoFaCode.user_id == user.id,
                AdminTwoFaCode.consumed_at.is_(None),
            )
            .order_by(AdminTwoFaCode.id.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise AppError("AUTH_005", "No active code. Request a new one.", 401)

        if now > row.expires_at.replace(tzinfo=UTC):
            row.consumed_at = now
            await self.db.commit()
            raise AppError("AUTH_004", "Code expired. Request a new one.", 401)

        if self._hash(code) != row.code_hash:
            row.attempts += 1
            row.last_attempt_at = now
            await self.db.commit()
            raise AppError("AUTH_005", "Wrong code.", 401)

        row.consumed_at = now
        await self.db.commit()
        return create_two_fa_ticket(str(user.uuid))
