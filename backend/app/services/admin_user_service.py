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


async def _active_owner_count(db: AsyncSession, exclude_id: int | None = None) -> int:
    query = select(func.count(User.id)).where(
        User.role == "owner",
        User.status == "active",
        User.deleted_at.is_(None),
    )
    if exclude_id is not None:
        query = query.where(User.id != exclude_id)
    return (await db.execute(query)).scalar_one()


async def set_status(db: AsyncSession, user_id: int, new_status: str) -> User:
    user = await db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise AppError("BOOKING_001", "User not found.", 404)
    if (
        user.role == "owner"
        and new_status != "active"
        and await _active_owner_count(db, exclude_id=user.id) == 0
    ):
        raise AppError("PERM_002", "Cannot suspend the last active owner.", 403)
    user.status = new_status
    await db.commit()
    await db.refresh(user)
    return user


async def update_role(
    db: AsyncSession, user_id: int, actor: User, role: str | None,
    position: str | None, gender: str | None, grants: dict[str, bool | None],
) -> User:
    """Owner-only: owner<->staff moves, position, gender (grandfathered
    blanks), delegation grants.

    The last active owner can never be demoted or suspended — the seat that
    closes itself must never lock the business out.
    """
    user = await db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise AppError("BOOKING_001", "User not found.", 404)
    if user.role not in ("owner", "staff"):
        raise AppError("PERM_001", "Only office accounts are managed here.", 403)
    if role is not None and role != user.role:
        if (
            user.role == "owner"
            and role == "staff"
            and await _active_owner_count(db, exclude_id=user.id) == 0
        ):
            raise AppError("PERM_002", "Cannot demote the last active owner.", 403)
        user.role = role
    if position is not None:
        user.position = position.strip() or None
    if gender is not None:
        user.gender = gender
    for grant in ("can_approve_technicians", "can_execute_refunds", "can_view_audit"):
        if grants.get(grant) is not None:
            setattr(user, grant, bool(grants[grant]))
    await db.commit()
    await db.refresh(user)
    return user


async def review_approval(
    db: AsyncSession, user_id: int, approve: bool, actor: User,
) -> User:
    """Maker-checker approvals (Phase 6 role plan):

    - staff accounts: owner approves (invite-proof via staff_invites).
    - technician accounts: owner approves, or staff holding
      can_approve_technicians (invite-proof via technician_invites).
    - customers are never approved here (self-registered).

    Mailbox-proof hard block preserved: approval requires a used,
    unexpired-at-use invite for the exact email — no activation of
    unverified or mistyped accounts.
    """
    from app.models.staff_invite import StaffInvite

    user = await db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise AppError("BOOKING_001", "User not found.", 404)
    if user.status != "pending_approval":
        raise AppError("BOOKING_003", "User is not pending approval.", 409)
    if user.role == "staff" and actor.role != "owner":
        raise AppError("PERM_002", "Only the owner approves staff accounts.", 403)
    if (
        user.role == "technician"
        and actor.role != "owner"
        and not actor.can_approve_technicians
    ):
        raise AppError("PERM_003", "Owner delegation required.", 403)
    if user.role not in ("staff", "technician"):
        raise AppError("PERM_001", "This account type needs no approval.", 403)
    if approve:
        invite_model = StaffInvite if user.role == "staff" else TechnicianInvite
        proven = await db.execute(
            select(invite_model.id).where(
                func.lower(invite_model.email) == user.email.lower(),
                invite_model.used_at.is_not(None),
                invite_model.used_at <= invite_model.expires_at,
                invite_model.revoked_at.is_(None),
            )
        )
        if proven.scalar_one_or_none() is None:
            raise AppError(
                "AUTH_007",
                "Mailbox not verified via invitation. Approve only verified applicants.",
                409,
            )
    user.status = "active" if approve else "inactive"
    kind = "staff" if user.role == "staff" else "technician"
    await notify(
        db, user.id,
        "technician_pending_approval",
        "Account approved" if approve else "Account not approved",
        f"Your {kind} account was approved. You can now sign in."
        if approve else
        f"Your {kind} application was not approved. Contact the office.",
    )
    await db.commit()
    await db.refresh(user)
    return user
