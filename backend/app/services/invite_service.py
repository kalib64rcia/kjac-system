"""Shared invite mechanics for staff + technician onboarding.

Both flows are the same machine with different tables, links, and mailers;
only accept_invite stays per-kind (different roles and notify fan-out).
Tables stay separate — no migration involved.
"""

import hashlib
import secrets
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.users import User

INVITE_TTL_DAYS = 7


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def live_invite_for_email(db: AsyncSession, model: Any, email: str) -> Any | None:
    result = await db.execute(
        select(model)
        .where(
            func.lower(model.email) == email.lower(),
            model.used_at.is_(None),
            model.revoked_at.is_(None),
            model.expires_at > datetime.now(UTC),
        )
        .order_by(model.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def send_invite(
    db: AsyncSession,
    model: Any,
    mail_fn: Callable[[str, str], Any],
    link_path: str,
    created_by: dict[str, Any],
    email: str,
) -> Any:
    base = settings.public_app_url
    email = email.strip().lower()
    existing = await db.execute(select(User.id).where(func.lower(User.email) == email))
    if existing.scalar_one_or_none() is not None:
        raise AppError("BOOKING_003", "An account with this email already exists.", 409)
    if await live_invite_for_email(db, model, email) is not None:
        raise AppError("BOOKING_003", "A live invite already exists for this email.", 409)
    token = secrets.token_urlsafe(32)
    row = model(
        email=email,
        token_hash=hash_token(token),
        expires_at=datetime.now(UTC) + timedelta(days=INVITE_TTL_DAYS),
        **created_by,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    mail_fn(email, f"{base.rstrip('/')}{link_path}?token={token}")
    return row


async def list_invites(db: AsyncSession, model: Any) -> list:
    result = await db.execute(select(model).order_by(model.id.desc()).limit(100))
    return list(result.scalars())


async def resend_invite(
    db: AsyncSession,
    model: Any,
    mail_fn: Callable[[str, str], Any],
    link_path: str,
    invite_id: int,
) -> Any:
    base = settings.public_app_url
    row = await db.get(model, invite_id)
    if row is None:
        raise AppError("BOOKING_001", "Invite not found.", 404)
    if row.used_at is not None:
        raise AppError("BOOKING_003", "Invite already used.", 409)
    if row.revoked_at is not None:
        raise AppError("BOOKING_003", "Invite revoked. Create a new one.", 409)
    token = secrets.token_urlsafe(32)
    row.token_hash = hash_token(token)
    row.expires_at = datetime.now(UTC) + timedelta(days=INVITE_TTL_DAYS)
    await db.commit()
    await db.refresh(row)
    mail_fn(row.email, f"{base.rstrip('/')}{link_path}?token={token}")
    return row


async def revoke_invite(db: AsyncSession, model: Any, invite_id: int) -> Any:
    row = await db.get(model, invite_id)
    if row is None:
        raise AppError("BOOKING_001", "Invite not found.", 404)
    if row.used_at is not None:
        raise AppError("BOOKING_003", "Invite already used.", 409)
    row.revoked_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(row)
    return row


async def usable_invite(db: AsyncSession, model: Any, token: str) -> Any | None:
    """Usable until decided: found, unrevoked, unexpired."""
    result = await db.execute(select(model).where(model.token_hash == hash_token(token)))
    invite = result.scalar_one_or_none()
    if invite is None:
        return None
    if invite.revoked_at is not None:
        return None
    if invite.expires_at.replace(tzinfo=UTC) <= datetime.now(UTC):
        return None
    return invite


async def invite_state(db: AsyncSession, model: Any, token: str) -> dict:
    """Resume state for an invite link (powers abandon-resume UX)."""
    invite = await usable_invite(db, model, token)
    if invite is None:
        return {"state": "invalid"}
    result = await db.execute(
        select(User).where(func.lower(User.email) == invite.email.lower())
    )
    user = result.scalar_one_or_none()
    if user is None:
        return {"state": "new", "email": invite.email}
    if user.status == "pending_approval":
        return {
            "state": "needs_login" if user.uuid is None else "waiting_approval",
            "email": invite.email,
        }
    return {"state": "decided", "status": user.status, "email": invite.email}
