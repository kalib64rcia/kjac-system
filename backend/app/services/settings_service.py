"""System settings service: typed reads, coerced writes, editable guard."""

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.system import SystemSetting


def coerce(data_type: str, raw: str) -> str:
    """Validate a raw string against the setting's data_type."""
    value = raw.strip()
    if data_type == "integer":
        try:
            return str(int(value))
        except ValueError as exc:
            raise AppError("VAL_001", "Value must be an integer.", 422) from exc
    if data_type == "boolean":
        if value.lower() not in ("true", "false"):
            raise AppError("VAL_001", "Value must be 'true' or 'false'.", 422)
        return value.lower()
    if data_type == "json":
        try:
            json.loads(value)
        except ValueError as exc:
            raise AppError("VAL_001", "Value must be valid JSON.", 422) from exc
        return value
    return raw


async def list_settings(db: AsyncSession) -> list[SystemSetting]:
    result = await db.execute(select(SystemSetting).order_by(SystemSetting.setting_key))
    return list(result.scalars())


async def update_setting(db: AsyncSession, key: str, raw_value: str) -> SystemSetting:
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.setting_key == key)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise AppError("BOOKING_001", "Setting not found.", 404)
    if not row.is_editable:
        raise AppError("PERM_001", "This setting is locked.", 403)
    row.setting_value = coerce(row.data_type, raw_value)
    await db.commit()
    await db.refresh(row)
    return row
