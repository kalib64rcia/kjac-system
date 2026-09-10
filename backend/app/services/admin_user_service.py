"""Admin user management: list, suspend/activate, approve technicians."""

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.tech_invite import TechnicianInvite
from app.models.users import User
from app.services.notify_service import notify


async def list_users(
    db: AsyncSession, role: str | None, status: str | None, search: str | None,
    page: int, limit: int,
) -> tuple[int, list[User]]:
    query = select(User).where(User.deleted_at.is_(None))
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    if search:
        like = f"%{search}%"
        query = query.where(
            or_(User.email.ilike(like), User.first_name.ilike(like),
                User.last_name.ilike(like))
        )
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    rows = (
        await db.execute(
            query.order_by(User.id).offset((page - 1) * limit).limit(limit)
        )
    ).scalars()
    return total, list(rows)


async def set_status(db: AsyncSession, user_id: int, new_status: str) -> User:
    user = await db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise AppError("BOOKING_001", "User not found.", 404)
    if user.role == "admin" and new_status != "active":
        raise AppError("PERM_001", "Admin accounts cannot be suspended here.", 403)
    user.status = new_status
    await db.commit()
    await db.refresh(user)
    return user


async def review_approval(db: AsyncSession, user_id: int, approve: bool) -> User:
    """Approve pending technicians (active) or deny (inactive + notify).

    Hard block (Phase 5 lock-in): a technician can only be approved if a used,
    unexpired-at-use invite exists for their email — mailbox proven, no
    activation of unverified or mistyped accounts.
    """
    user = await db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise AppError("BOOKING_001", "User not found.", 404)
    if user.status != "pending_approval":
        raise AppError("BOOKING_003", "User is not pending approval.", 409)
    if approve and user.role == "technician":
        proven = await db.execute(
            select(TechnicianInvite.id).where(
                func.lower(TechnicianInvite.email) == user.email.lower(),
                TechnicianInvite.used_at.is_not(None),
                TechnicianInvite.used_at <= TechnicianInvite.expires_at,
                TechnicianInvite.revoked_at.is_(None),
            )
        )
        if proven.scalar_one_or_none() is None:
            raise AppError(
                "AUTH_007",
                "Mailbox not verified via invitation. Approve only verified applicants.",
                409,
            )
    user.status = "active" if approve else "inactive"
    await notify(
        db, user.id,
        "technician_pending_approval",
        "Account approved" if approve else "Account not approved",
        "Your technician account was approved. You can now sign in."
        if approve else
        "Your technician application was not approved. Contact the office.",
    )
    await db.commit()
    await db.refresh(user)
    return user
