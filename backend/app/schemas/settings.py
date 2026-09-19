"""Settings schemas + service (coercion + editable guard)."""

from pydantic import BaseModel, ConfigDict, Field


class SettingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    setting_key: str
    setting_value: str
    data_type: str
    category: str | None = None
    description: str | None = None
    is_editable: bool


class SettingUpdate(BaseModel):
    # Empty string is a legal "cleared/hidden" value for optional content
    # (2nd phone, mission/vision, GCash name). Required fields are guarded
    # client-side before any PATCH is sent.
    setting_value: str = Field(min_length=0, max_length=2000)
