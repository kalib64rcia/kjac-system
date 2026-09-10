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
    setting_value: str = Field(min_length=1, max_length=2000)
