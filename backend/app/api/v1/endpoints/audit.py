"""Audit log viewer: owner reads; delegated staff with can_view_audit read.

Rows are trigger-written and immutable (no write endpoints exist by design).
"""

from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select

from app.api.deps import DbDep, grants
from app.core.rate_limit import limiter
from app.models.system import AuditLog
from app.models.users import User

router = APIRouter(tags=["audit"])


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    table_name: str
    record_id: int
    action: str
    old_data: dict[str, Any] | None = None
    new_data: dict[str, Any] | None = None
    changed_fields: list[str] | None = None
    ip_address: str | None = None
    request_id: str | None = None
    created_at: datetime


class AuditLogListResponse(BaseModel):
    total: int
    items: list[AuditLogOut]


@router.get("/admin/audit-logs", response_model=AuditLogListResponse)
@limiter.limit("300/minute")
async def list_audit_logs(
    request: Request,
    db: DbDep,
    _viewer: Annotated[User, Depends(grants("can_view_audit"))],
    table_name: str | None = Query(default=None, max_length=50),
    action: str | None = Query(default=None, max_length=10),
    user_id: int | None = Query(default=None, ge=1),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> AuditLogListResponse:
    # grants(): owners always pass; staff need can_view_audit.
    query = select(AuditLog)
    if table_name:
        query = query.where(AuditLog.table_name == table_name)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    total = (
        await db.execute(select(func.count()).select_from(query.subquery()))
    ).scalar_one()
    rows = (
        await db.execute(
            query.order_by(AuditLog.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).scalars()
    rows = list(rows)
    return AuditLogListResponse(
        total=total, items=[AuditLogOut.model_validate(r) for r in rows]
    )
