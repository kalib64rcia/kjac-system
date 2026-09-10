"""Notification center: list, mark read, mark all read (owner-only)."""

from fastapi import APIRouter, Query, Request, status

from app.api.deps import CurrentUser, DbDep
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services import notification_service as notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/me", response_model=NotificationListResponse)
@limiter.limit("300/minute")
async def my_notifications(
    request: Request, db: DbDep, user: CurrentUser,
    is_read: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> NotificationListResponse:
    if user is None:
        raise AppError("AUTH_001", "Not authenticated.", 401)
    total, unread, rows = await notifications.list_for_user(db, user.id, is_read, page, limit)
    return NotificationListResponse(
        total=total, unread_count=unread,
        items=[NotificationResponse.model_validate(r) for r in rows],
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
@limiter.limit("300/minute")
async def mark_read(request: Request, notification_id: int, db: DbDep,
                    user: CurrentUser) -> NotificationResponse:
    if user is None:
        raise AppError("AUTH_001", "Not authenticated.", 401)
    row = await notifications.mark_read(db, user.id, notification_id)
    return NotificationResponse.model_validate(row)


@router.post("/read-all", status_code=status.HTTP_200_OK)
@limiter.limit("60/minute")
async def mark_all_read(request: Request, db: DbDep, user: CurrentUser) -> dict:
    if user is None:
        raise AppError("AUTH_001", "Not authenticated.", 401)
    count = await notifications.mark_all_read(db, user.id)
    return {"marked_read": count}
