"""Self-service profile endpoints (authenticated users)."""

from fastapi import APIRouter, Request

from app.api.deps import CurrentUser, DbDep
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.schemas.auth import SyncResponse
from app.schemas.profile import ProfileUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=SyncResponse)
@limiter.limit("60/minute")
async def update_my_profile(
    request: Request, payload: ProfileUpdate, db: DbDep, user: CurrentUser
) -> SyncResponse:
    if user is None:
        raise AppError("AUTH_001", "Not authenticated.", 401)
    updated = await UserService(db).update_profile(
        user, payload.model_dump(exclude_unset=True)
    )
    body = SyncResponse.model_validate(updated)
    body.profile_complete = UserService.is_profile_complete(updated)
    body.created = False
    return body
