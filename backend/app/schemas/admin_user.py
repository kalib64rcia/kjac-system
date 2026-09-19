"""Admin user management schemas + service + endpoints."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    status: str
    position: str | None = None
    gender: str | None = None
    can_approve_technicians: bool = False
    can_execute_refunds: bool = False
    can_view_audit: bool = False
    created_at: datetime | None = None


class AdminUserListResponse(BaseModel):
    total: int
    items: list[AdminUserResponse]


class UserStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(active|inactive|suspended)$")


class UserApproval(BaseModel):
    action: str = Field(pattern=r"^(approve|deny)$")


class RoleUpdate(BaseModel):
    """Owner-only: change role (owner<->staff), position, delegation grants.

    Demoting the last active owner is rejected in the service layer.
    """

    role: str | None = Field(default=None, pattern=r"^(owner|staff)$")
    position: str | None = Field(default=None, max_length=100)
    gender: str | None = Field(default=None, pattern=r"^(male|female)$")
    can_approve_technicians: bool | None = None
    can_execute_refunds: bool | None = None
    can_view_audit: bool | None = None
