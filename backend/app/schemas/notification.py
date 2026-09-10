"""Notification center schemas + service + endpoints (owner-only)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    message: str
    booking_id: int | None = None
    is_read: bool
    created_at: datetime | None = None


class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    items: list[NotificationResponse]
