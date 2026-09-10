"""Admin user management endpoints."""

from fastapi import APIRouter, Query, Request

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.rate_limit import limiter
from app.schemas.admin_user import (
    AdminUserListResponse,
    AdminUserResponse,
    UserApproval,
    UserStatusUpdate,
)
from app.services import admin_user_service as users

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=AdminUserListResponse)
@limiter.limit("500/minute")
async def search_users(
    request: Request, db: DbDep, admin: AdminTwoFaUser,
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
                        db: DbDep, admin: AdminTwoFaUser) -> AdminUserResponse:
    row = await users.set_status(db, user_id, payload.status)
    return AdminUserResponse.model_validate(row)


@router.patch("/{user_id}/approval", response_model=AdminUserResponse)
@limiter.limit("60/minute")
async def review_user(request: Request, user_id: int, payload: UserApproval,
                      db: DbDep, admin: AdminTwoFaUser) -> AdminUserResponse:
    row = await users.review_approval(db, user_id, payload.action == "approve")
    return AdminUserResponse.model_validate(row)
