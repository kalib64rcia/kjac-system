"""Public landing content: landing-category settings only (read-only)."""

from fastapi import APIRouter, Request
from sqlalchemy import select

from app.api.deps import DbDep
from app.core.rate_limit import limiter
from app.models.system import SystemSetting
from app.schemas.settings import SettingOut

router = APIRouter(prefix="/content", tags=["content"])

# Non-landing keys the public site needs to render correctly
# (schedule rules, contact info, GCash details). Everything else stays
# admin-only.
PUBLIC_EXTRA_KEYS = (
    "allow_sunday_bookings",
    "business_email",
    "business_phone",
    "gcash_account_number",
    "gcash_account_name",
)


@router.get("/landing", response_model=list[SettingOut])
@limiter.limit("100/minute")
async def landing_content(request: Request, db: DbDep) -> list[SettingOut]:
    result = await db.execute(
        select(SystemSetting)
        .where(
            (SystemSetting.category == "landing")
            | (SystemSetting.setting_key.in_(PUBLIC_EXTRA_KEYS))
        )
        .order_by(SystemSetting.setting_key)
    )
    return [SettingOut.model_validate(r) for r in result.scalars()]
