"""Invite-gated technician onboarding (Phase 5, admin-only).

Admin collects the email in person → system emails a single-use link →
technician completes their own form → pending → admin review → activate.
No public signup surface; no emailed passwords.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.tech_invite import TechnicianInvite
from app.models.users import User
from app.services.email_service import EmailService
from app.services.notify_service import notify

INVITE_TTL_DAYS = 7


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _invite_link(token: str) -> str:
    return f"{settings.public_app_url.rstrip('/')}/technician/accept?token={token}"


async def _live_invite_for_email(
    db: AsyncSession, email: str
) -> TechnicianInvite | None:
    result = await db.execute(
        select(TechnicianInvite)
        .where(
            func.lower(TechnicianInvite.email) == email.lower(),
            TechnicianInvite.used_at.is_(None),
            TechnicianInvite.revoked_at.is_(None),
            TechnicianInvite.expires_at > datetime.now(UTC),
        )
        .order_by(TechnicianInvite.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def send_invite(
    db: AsyncSession, mailer: EmailService, admin: User, email: str
) -> TechnicianInvite:
    email = email.strip().lower()
    existing = await db.execute(select(User.id).where(func.lower(User.email) == email))
    if existing.scalar_one_or_none() is not None:
        raise AppError("BOOKING_003", "An account with this email already exists.", 409)
    if await _live_invite_for_email(db, email) is not None:
        raise AppError("BOOKING_003", "A live invite already exists for this email.", 409)
    token = secrets.token_urlsafe(32)
    row = TechnicianInvite(
        email=email,
        token_hash=_hash(token),
        expires_at=datetime.now(UTC) + timedelta(days=INVITE_TTL_DAYS),
        created_by_admin_id=admin.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    mailer.send_technician_invite(email, _invite_link(token))
    return row


async def list_invites(db: AsyncSession) -> list[TechnicianInvite]:
    result = await db.execute(
        select(TechnicianInvite).order_by(TechnicianInvite.id.desc()).limit(100)
    )
    return list(result.scalars())


async def resend_invite(
    db: AsyncSession, mailer: EmailService, invite_id: int
) -> TechnicianInvite:
    row = await db.get(TechnicianInvite, invite_id)
    if row is None:
        raise AppError("BOOKING_001", "Invite not found.", 404)
    if row.used_at is not None:
        raise AppError("BOOKING_003", "Invite already used.", 409)
    if row.revoked_at is not None:
        raise AppError("BOOKING_003", "Invite revoked. Create a new one.", 409)
    token = secrets.token_urlsafe(32)
    row.token_hash = _hash(token)
    row.expires_at = datetime.now(UTC) + timedelta(days=INVITE_TTL_DAYS)
    await db.commit()
    await db.refresh(row)
    mailer.send_technician_invite(row.email, _invite_link(token))
    return row


async def revoke_invite(db: AsyncSession, invite_id: int) -> TechnicianInvite:
    row = await db.get(TechnicianInvite, invite_id)
    if row is None:
        raise AppError("BOOKING_001", "Invite not found.", 404)
    if row.used_at is not None:
        raise AppError("BOOKING_003", "Invite already used.", 409)
    row.revoked_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(row)
    return row


async def accept_invite(db: AsyncSession, token: str, fields: dict) -> User:
    """Validate the single-use link and create the pending technician row."""
    result = await db.execute(
        select(TechnicianInvite).where(TechnicianInvite.token_hash == _hash(token))
    )
    invite = result.scalar_one_or_none()
    if invite is None or not invite.is_live:
        raise AppError("AUTH_005", "Invite is invalid, expired, or already used.", 400)
    if fields["email"].strip().lower() != invite.email.lower():
        raise AppError("AUTH_005", "Form email must match the invited email.", 400)
    existing = await db.execute(
        select(User.id).where(func.lower(User.email) == invite.email.lower())
    )
    if existing.scalar_one_or_none() is not None:
        raise AppError("BOOKING_003", "An account with this email already exists.", 409)

    user = User(
        role="technician",
        status="pending_approval",
        uuid=None,  # linked to Supabase at first sync
        email=invite.email,
        first_name=fields["first_name"],
        middle_name=fields.get("middle_name"),
        last_name=fields["last_name"],
        phone=fields["phone"],
        date_of_birth=fields.get("date_of_birth"),
        region_code=fields.get("region_code"),
        province_code=fields.get("province_code"),
        city_municipality_code=fields.get("city_municipality_code"),
        barangay_code=fields.get("barangay_code"),
        street_address=fields.get("street_address"),
        landmark=fields.get("landmark"),
    )
    db.add(user)
    invite.used_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(user)
    result = await db.execute(
        select(User.id).where(User.role == "admin", User.deleted_at.is_(None))
    )
    for (admin_id,) in result.all():
        await notify(
            db, admin_id, "technician_pending_approval", "Technician application",
            f"{user.first_name} {user.last_name} ({user.email}) submitted a form.",
        )
    await db.commit()
    await db.refresh(user)
    return user
