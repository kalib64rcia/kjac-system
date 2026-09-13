"""Invite-gated staff onboarding (mirrors technician invites, owner-managed).

Owner collects the email in person → system emails a single-use link →
staffer completes their own uniform employee form → pending → owner review
→ activate. No public signup surface; no emailed passwords.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.staff_invite import StaffInvite
from app.models.users import User
from app.services.email_service import EmailService
from app.services.notify_service import notify

INVITE_TTL_DAYS = 7


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _invite_link(token: str) -> str:
    return f"{settings.public_app_url.rstrip('/')}/staff/accept?token={token}"


async def _live_invite_for_email(
    db: AsyncSession, email: str
) -> StaffInvite | None:
    result = await db.execute(
        select(StaffInvite)
        .where(
            func.lower(StaffInvite.email) == email.lower(),
            StaffInvite.used_at.is_(None),
            StaffInvite.revoked_at.is_(None),
            StaffInvite.expires_at > datetime.now(UTC),
        )
        .order_by(StaffInvite.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def send_invite(
    db: AsyncSession, mailer: EmailService, owner: User, email: str
) -> StaffInvite:
    email = email.strip().lower()
    existing = await db.execute(select(User.id).where(func.lower(User.email) == email))
    if existing.scalar_one_or_none() is not None:
        raise AppError("BOOKING_003", "An account with this email already exists.", 409)
    if await _live_invite_for_email(db, email) is not None:
        raise AppError("BOOKING_003", "A live invite already exists for this email.", 409)
    token = secrets.token_urlsafe(32)
    row = StaffInvite(
        email=email,
        token_hash=_hash(token),
        expires_at=datetime.now(UTC) + timedelta(days=INVITE_TTL_DAYS),
        created_by_owner_id=owner.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    mailer.send_staff_invite(email, _invite_link(token))
    return row


async def list_invites(db: AsyncSession) -> list[StaffInvite]:
    result = await db.execute(
        select(StaffInvite).order_by(StaffInvite.id.desc()).limit(100)
    )
    return list(result.scalars())


async def resend_invite(
    db: AsyncSession, mailer: EmailService, invite_id: int
) -> StaffInvite:
    row = await db.get(StaffInvite, invite_id)
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
    mailer.send_staff_invite(row.email, _invite_link(token))
    return row


async def revoke_invite(db: AsyncSession, invite_id: int) -> StaffInvite:
    row = await db.get(StaffInvite, invite_id)
    if row is None:
        raise AppError("BOOKING_001", "Invite not found.", 404)
    if row.used_at is not None:
        raise AppError("BOOKING_003", "Invite already used.", 409)
    row.revoked_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(row)
    return row


async def _usable_invite(db: AsyncSession, token: str) -> StaffInvite | None:
    """Same resume contract as technician invites: usable until decided;
    used_at means 'mailbox proven', not 'burned'."""
    result = await db.execute(
        select(StaffInvite).where(StaffInvite.token_hash == _hash(token))
    )
    invite = result.scalar_one_or_none()
    if invite is None:
        return None
    if invite.revoked_at is not None:
        return None
    if invite.expires_at.replace(tzinfo=UTC) <= datetime.now(UTC):
        return None
    return invite


async def invite_state(db: AsyncSession, token: str) -> dict:
    """Resume state for a staff invite link (see tech_invite_service)."""
    invite = await _usable_invite(db, token)
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


async def accept_invite(db: AsyncSession, token: str, fields: dict) -> User:
    """Validate the single-use link and create (or refresh) the pending row.

    Idempotent for same token + same email while still pending.
    """
    invite = await _usable_invite(db, token)
    if invite is None:
        raise AppError("AUTH_005", "Invite is invalid, expired, or already used.", 400)
    if fields["email"].strip().lower() != invite.email.lower():
        raise AppError("AUTH_005", "Form email must match the invited email.", 400)
    existing = await db.execute(
        select(User).where(func.lower(User.email) == invite.email.lower())
    )
    user = existing.scalar_one_or_none()
    if user is not None:
        if user.status != "pending_approval" or user.uuid is not None:
            raise AppError("BOOKING_003", "An account with this email already exists.", 409)
        user.first_name = fields["first_name"]
        user.middle_name = fields.get("middle_name")
        user.last_name = fields["last_name"]
        user.phone = fields["phone"]
        user.position = fields.get("position")
        user.gender = fields["gender"]
        user.date_of_birth = fields["date_of_birth"]
        user.region_code = fields.get("region_code")
        user.province_code = fields.get("province_code")
        user.city_municipality_code = fields.get("city_municipality_code")
        user.barangay_code = fields.get("barangay_code")
        user.data_privacy_consented_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(user)
        return user

    user = User(
        role="staff",
        status="pending_approval",
        uuid=None,  # linked to Supabase at first sync
        email=invite.email,
        first_name=fields["first_name"],
        middle_name=fields.get("middle_name"),
        last_name=fields["last_name"],
        phone=fields["phone"],
        position=fields.get("position"),
        gender=fields["gender"],
        date_of_birth=fields["date_of_birth"],
        region_code=fields.get("region_code"),
        province_code=fields.get("province_code"),
        city_municipality_code=fields.get("city_municipality_code"),
        barangay_code=fields.get("barangay_code"),
        data_privacy_consented_at=datetime.now(UTC),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    if invite.used_at is None:
        invite.used_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(user)
    result = await db.execute(
        select(User.id).where(
            User.role == "owner", User.status == "active", User.deleted_at.is_(None)
        )
    )
    for (owner_id,) in result.all():
        await notify(
            db, owner_id, "staff_pending_approval", "Staff application",
            f"{user.first_name} {user.last_name} ({user.email}) submitted a form.",
        )
    await db.commit()
    await db.refresh(user)
    return user
