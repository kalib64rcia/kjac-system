"""Admin settings: list all, update one (type-coerced, editable-guarded)."""

from fastapi import APIRouter, Request

from app.api.deps import DbDep, OwnerTwoFaUser
from app.core.rate_limit import limiter
from app.schemas.settings import SettingOut, SettingUpdate
from app.services import settings_service as settings

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])


@router.get("", response_model=list[SettingOut])
@limiter.limit("500/minute")
async def list_settings(request: Request, db: DbDep,
                        owner: OwnerTwoFaUser) -> list[SettingOut]:
    rows = await settings.list_settings(db)
    return [SettingOut.model_validate(r) for r in rows]


@router.patch("/{setting_key}", response_model=SettingOut)
@limiter.limit("60/minute")
async def update_setting(request: Request, setting_key: str,
                         payload: SettingUpdate, db: DbDep,
                         owner: OwnerTwoFaUser) -> SettingOut:
    row = await settings.update_setting(db, setting_key, payload.setting_value)
    return SettingOut.model_validate(row)
