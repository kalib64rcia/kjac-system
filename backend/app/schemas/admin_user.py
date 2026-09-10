"""Admin user management schemas + service + endpoints."""

from pydantic import BaseModel, ConfigDict, Field


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    status: str


class AdminUserListResponse(BaseModel):
    total: int
    items: list[AdminUserResponse]


class UserStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(active|inactive|suspended)$")


class UserApproval(BaseModel):
    action: str = Field(pattern=r"^(approve|deny)$")
