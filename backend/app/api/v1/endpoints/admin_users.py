"""Admin user management endpoints."""

from fastapi import APIRouter, Query, Request

from app.api.deps import AdminTwoFaUser, DbDep, OwnerTwoFaUser
from app.core.rate_limit import limiter
from app.schemas.admin_user import (
    AdminUserListResponse,
    AdminUserResponse,
    RoleUpdate,
    UserApproval,
    UserStatusUpdate,
)
from app.services import admin_user_service as users

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=AdminUserListResponse)
@limiter.limit("500/minute")
async def search_users(
    request: Request, db: DbDep, owner: OwnerTwoFaUser,
    role: str | None = Query(default=None, max_length=20),
    user_status: str | None = Query(default=None, max_length=20, alias="status"),
    search: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> AdminUserListResponse:
    total, rows = await users.list_users(db, role, user_status, search, page, limit)
    return AdminUserListResponse(
        total=total, items=[AdminUserResponse.model_validate(r) for r in rows]
    )


@router.patch("/{user_id}/status", response_model=AdminUserResponse)
@limiter.limit("60/minute")
async def change_status(request: Request, user_id: int, payload: UserStatusUpdate,
                        db: DbDep, owner: OwnerTwoFaUser) -> AdminUserResponse:
    row = await users.set_status(db, user_id, payload.status)
    return AdminUserResponse.model_validate(row)


@router.patch("/{user_id}/approval", response_model=AdminUserResponse)
@limiter.limit("60/minute")
async def review_user(request: Request, user_id: int, payload: UserApproval,
                      db: DbDep, actor: AdminTwoFaUser) -> AdminUserResponse:
    # Office-wide entry; maker-checker enforced in service: staff approvals
    # are owner-only, technician approvals allow delegated staff.
    row = await users.review_approval(db, user_id, payload.action == "approve", actor)
    return AdminUserResponse.model_validate(row)


@router.patch("/{user_id}/role", response_model=AdminUserResponse)
@limiter.limit("60/minute")
async def change_role(request: Request, user_id: int, payload: RoleUpdate,
                      db: DbDep, owner: OwnerTwoFaUser) -> AdminUserResponse:
    row = await users.update_role(
        db, user_id, owner, payload.role, payload.position,
        {
            "can_approve_technicians": payload.can_approve_technicians,
            "can_execute_refunds": payload.can_execute_refunds,
            "can_view_audit": payload.can_view_audit,
        },
    )
    return AdminUserResponse.model_validate(row)
