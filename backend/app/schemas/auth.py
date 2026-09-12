"""Auth schemas (Pydantic v2)."""

import re
import uuid as uuid_lib

from pydantic import BaseModel, ConfigDict, Field, field_validator

PHONE_RE = re.compile(r"^(09|\+639)\d{9}$")


class TwoFaRequestResponse(BaseModel):
    channel: str = "email"
    masked_email: str
    expires_in_minutes: int


class TwoFaVerifyRequest(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


class TwoFaVerifyResponse(BaseModel):
    two_fa_token: str
    expires_in_hours: int


class MeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: uuid_lib.UUID
    email: str
    first_name: str
    last_name: str
    role: str
    status: str
    position: str | None = None
    can_approve_technicians: bool = False
    can_execute_refunds: bool = False
    can_view_audit: bool = False


class SyncRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=9, max_length=25)

    @field_validator("phone")
    @classmethod
    def phone_format(cls, value: str) -> str:
        if not PHONE_RE.match(value):
            raise ValueError("Use 09XXXXXXXXX or +639XXXXXXXXX")
        return value


class SyncResponse(MeResponse):
    profile_complete: bool = False
    created: bool = False
