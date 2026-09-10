"""Admin analytics dashboard (API.md §10 shape, concrete chart items)."""

from datetime import UTC, datetime

from fastapi import APIRouter, Request

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.rate_limit import limiter
from app.schemas.analytics import DashboardResponse
from app.services import analytics_service as analytics

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


@router.get("/dashboard", response_model=DashboardResponse)
@limiter.limit("60/minute")
async def dashboard(request: Request, db: DbDep,
                    admin: AdminTwoFaUser) -> DashboardResponse:
    data = await analytics.dashboard(db, datetime.now(UTC))
    return DashboardResponse.model_validate(data)
