"""Shared FastAPI dependencies (Annotated pattern per fastapi/fastapi-patterns skills)."""

import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import AppError
from app.core.security import (
    CurrentEmail,
    CurrentSubject,
    get_current_subject,
    verify_two_fa_ticket,
)
from app.models.users import User
from app.services.user_service import UserService

DbDep = Annotated[AsyncSession, Depends(get_db)]

# ponytail: session-scoped SET (not SET LOCAL) + teardown RESET. Holds because
# every write flow stamps before writing and commits once at the end; revisit
# with per-transaction SET LOCAL if multi-commit writes ever appear.
_AUDIT_ACTOR_GUC = "app.current_user_uuid"


async def _stamp_audit_actor(db: AsyncSession, subject: str | None) -> None:
    """Expose the request login to the audit trigger (NULL-safe for guests)."""
    if subject is None:
        await db.execute(text(f"RESET {_AUDIT_ACTOR_GUC}"))
        return
    try:
        clean = str(uuid.UUID(str(subject)))
    except ValueError:
        await db.execute(text(f"RESET {_AUDIT_ACTOR_GUC}"))
        return
    await db.execute(text(f"SET {_AUDIT_ACTOR_GUC} = '{clean}'"))


async def get_current_user(db: DbDep, subject: CurrentSubject) -> User | None:
    """App user row for a verified Supabase subject (None if unknown)."""
    await _stamp_audit_actor(db, subject)
    return await UserService(db).get_by_uuid(subject)


CurrentUser = Annotated[User | None, Depends(get_current_user)]


_optional_bearer = HTTPBearer(auto_error=False)


async def _optional_subject(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_optional_bearer)],
) -> str | None:
    """Verified Supabase subject, or None for guests/invalid tokens.

    Separate dependency (not a direct call) so tests can override it.
    """
    if credentials is None:
        return None
    try:
        return await get_current_subject(credentials)
    except HTTPException:
        return None


async def get_optional_user(
    db: DbDep,
    subject: Annotated[str | None, Depends(_optional_subject)],
) -> User | None:
    """Authenticated owner when a valid token is present, else None (guests)."""
    if subject is None:
        await _stamp_audit_actor(db, None)
        return None
    await _stamp_audit_actor(db, subject)
    return await UserService(db).get_by_uuid(subject)


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


async def require_admin(user: CurrentUser) -> User:
    """Office user (owner or staff), active. Name kept for the 67 call sites;
    is_admin() in SQL means the same office set."""
    if user is None or user.deleted_at is not None:
        raise AppError("AUTH_001", "Not authenticated.", 401)
    if user.role not in ("owner", "staff") or user.status != "active":
        raise AppError("PERM_001", "Admin access required.", 403)
    return user


AdminUser = Annotated[User, Depends(require_admin)]


async def require_owner(user: AdminUser) -> User:
    """Owner-only ring: payroll, settings, audit, staff/tech approvals."""
    if user.role != "owner":
        raise AppError("PERM_002", "Owner access required.", 403)
    return user


OwnerUser = Annotated[User, Depends(require_owner)]


async def require_admin_2fa(
    db: DbDep,
    user: AdminUser,
    x_admin_2fa: Annotated[str | None, Header(alias="X-Admin-2FA")] = None,
) -> User:
    """Admin + valid 2FA ticket whose subject matches the Supabase identity."""
    if not x_admin_2fa:
        raise AppError("AUTH_005", "2FA verification required.", 401)
    ticket_subject = verify_two_fa_ticket(x_admin_2fa)
    if ticket_subject != str(user.uuid):
        raise AppError("AUTH_005", "2FA ticket does not match this user.", 401)
    return user


AdminTwoFaUser = Annotated[User, Depends(require_admin_2fa)]


async def require_owner_2fa(
    db: DbDep,
    user: OwnerUser,
    x_admin_2fa: Annotated[str | None, Header(alias="X-Admin-2FA")] = None,
) -> User:
    """Owner + valid 2FA ticket (same ticket header, role narrowed)."""
    if not x_admin_2fa:
        raise AppError("AUTH_005", "2FA verification required.", 401)
    ticket_subject = verify_two_fa_ticket(x_admin_2fa)
    if ticket_subject != str(user.uuid):
        raise AppError("AUTH_005", "2FA ticket does not match this user.", 401)
    return user


OwnerTwoFaUser = Annotated[User, Depends(require_owner_2fa)]


def grants(*names: str):
    """Per-account delegation: owner always passes; staff need every flag.

    Usage: user: Annotated[User, Depends(grants("can_execute_refunds"))].
    Must be applied UNDER an office+2FA dependency (it checks flags, not auth).
    """
    async def _check(user: AdminTwoFaUser) -> User:
        if user.role == "owner":
            return user
        missing = [n for n in names if not getattr(user, n, False)]
        if missing:
            raise AppError("PERM_003", "Owner delegation required.", 403)
        return user

    return _check

__all__ = [
    "AdminTwoFaUser",
    "AdminUser",
    "CurrentEmail",
    "CurrentSubject",
    "CurrentUser",
    "DbDep",
    "OptionalUser",
    "OwnerTwoFaUser",
    "OwnerUser",
    "get_current_user",
    "get_optional_user",
    "grants",
]
