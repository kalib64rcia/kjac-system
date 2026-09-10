"""Customer profile schemas (sync + update)."""

import re

from pydantic import BaseModel, Field, field_validator

PHONE_RE = re.compile(r"^(09|\+639)\d{9}$")


class ProfileUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, min_length=9, max_length=25)
    region_code: str | None = Field(default=None, max_length=20)
    province_code: str | None = Field(default=None, max_length=20)
    city_municipality_code: str | None = Field(default=None, max_length=20)
    barangay_code: str | None = Field(default=None, max_length=20)
    street_address: str | None = Field(default=None, min_length=5, max_length=500)
    landmark: str | None = Field(default=None, max_length=255)

    @field_validator("phone")
    @classmethod
    def phone_format(cls, value: str | None) -> str | None:
        if value is not None and not PHONE_RE.match(value):
            raise ValueError("Use 09XXXXXXXXX or +639XXXXXXXXX")
        return value
