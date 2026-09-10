"""Technician invite schemas."""

import re
from datetime import UTC, date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

PHONE_RE = re.compile(r"^(09|\+639)\d{9}$")


class InviteCreate(BaseModel):
    email: EmailStr


class InviteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    expires_at: datetime
    used_at: datetime | None = None
    revoked_at: datetime | None = None


class InviteAccept(BaseModel):
    token: str = Field(min_length=10, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=9, max_length=25)
    date_of_birth: date | None = None
    region_code: str | None = Field(default=None, max_length=20)
    province_code: str | None = Field(default=None, max_length=20)
    city_municipality_code: str | None = Field(default=None, max_length=20)
    barangay_code: str | None = Field(default=None, max_length=20)
    street_address: str | None = Field(default=None, max_length=500)
    landmark: str | None = Field(default=None, max_length=255)

    @field_validator("phone")
    @classmethod
    def phone_format(cls, value: str) -> str:
        if not PHONE_RE.match(value):
            raise ValueError("Use 09XXXXXXXXX or +639XXXXXXXXX")
        return value

    @field_validator("date_of_birth")
    @classmethod
    def adult_only(cls, value: date | None) -> date | None:
        if value is not None:
            today = datetime.now(UTC).date()
            age = today.year - value.year - (
                (today.month, today.day) < (value.month, value.day)
            )
            if age < 18:
                raise ValueError("Technicians must be 18 or older")
        return value


class InviteAcceptResponse(BaseModel):
    id: int
    status: str
