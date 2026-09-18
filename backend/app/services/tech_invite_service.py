"""Invite-gated technician onboarding (Phase 5, admin-only).

Admin collects the email in person → system emails a single-use link →
technician completes their own form → pending → admin review → activate.
No public signup surface; no emailed passwords.

Shared mechanics live in invite_service; only accept_invite stays here
(technician role + owner/delegate fan-out).
"""

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.tech_invite import TechnicianInvite
from app.models.users import User
from app.services import invite_service as invites
from app.services.email_service import EmailService
from app.services.notify_service import notify


async def send_invite(
    db: AsyncSession, mailer: EmailService, admin: User, email: str
) -> TechnicianInvite:
    return await invites.send_invite(
        db, TechnicianInvite, mailer.send_technician_invite, "/technician/accept",
        {"created_by_admin_id": admin.id}, email,
    )


async def list_invites(db: AsyncSession) -> list[TechnicianInvite]:
    return await invites.list_invites(db, TechnicianInvite)


async def resend_invite(
    db: AsyncSession, mailer: EmailService, invite_id: int
) -> TechnicianInvite:
    return await invites.resend_invite(
        db, TechnicianInvite, mailer.send_technician_invite, "/technician/accept",
        invite_id,
    )


async def revoke_invite(db: AsyncSession, invite_id: int) -> TechnicianInvite:
    return await invites.revoke_invite(db, TechnicianInvite, invite_id)


async def invite_state(db: AsyncSession, token: str) -> dict:
    """Resume state for an invite link (powers abandon-resume UX)."""
    return await invites.invite_state(db, TechnicianInvite, token)


async def accept_invite(db: AsyncSession, token: str, fields: dict) -> User:
    """Validate the single-use link and create (or refresh) the pending row.

    Idempotent for same token + same email while still pending: updates the
    row instead of conflicting, so double-clicks and retries are safe.
    """
    invite = await invites.usable_invite(db, TechnicianInvite, token)
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
        # Idempotent retry: refresh the pending row with latest values.
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
        role="technician",
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
        # Mailbox proven: the form arrived through the emailed secret link.
        # Approval review requires this stamp; resume does not consume it.
        invite.used_at = datetime.now(UTC)
    result = await db.execute(
        select(User.id).where(
            User.role == "owner",
            User.status == "active",
            User.deleted_at.is_(None),
        )
    )
    notify_ids = [row[0] for row in result.all()]
    result = await db.execute(
        select(User.id).where(
            User.role == "staff",
            User.status == "active",
            User.deleted_at.is_(None),
            User.can_approve_technicians.is_(True),
        )
    )
    notify_ids += [row[0] for row in result.all()]
    for admin_id in notify_ids:
        await notify(
            db, admin_id, "technician_pending_approval", "Technician application",
            f"{user.first_name} {user.last_name} ({user.email}) submitted a form.",
        )
    await db.commit()
    await db.refresh(user)
    return user
