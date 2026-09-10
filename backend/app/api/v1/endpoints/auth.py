"""Auth endpoints: 2FA code request/verify (admins) + current-user profile.

Password signup/signin lives in Supabase Auth (clients call it directly);
this API only verifies Supabase JWTs and layers admin email-code 2FA on top.
"""

from fastapi import APIRouter, Request, status

from app.api.deps import AdminUser, CurrentEmail, CurrentSubject, CurrentUser, DbDep
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.schemas.auth import (
    MeResponse,
    SyncRequest,
    SyncResponse,
    TwoFaRequestResponse,
    TwoFaVerifyRequest,
    TwoFaVerifyResponse,
)
from app.services.email_service import get_email_service
from app.services.two_fa_service import TwoFaService
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    shown = local[:1] if local else ""
    return f"{shown}***@{domain}"


@router.post("/2fa/request", response_model=TwoFaRequestResponse,
             status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/minute")
async def request_two_fa_code(request: Request, user: AdminUser, db: DbDep) -> TwoFaRequestResponse:
    service = TwoFaService(db, get_email_service())
    ttl = await service.request_code(user)
    return TwoFaRequestResponse(masked_email=_mask_email(user.email), expires_in_minutes=ttl)


@router.post("/2fa/verify", response_model=TwoFaVerifyResponse)
@limiter.limit("10/minute")
async def verify_two_fa_code(
    request: Request, payload: TwoFaVerifyRequest, user: AdminUser, db: DbDep
) -> TwoFaVerifyResponse:
    from app.core.config import settings

    service = TwoFaService(db, get_email_service())
    ticket = await service.verify_code(user, payload.code)
    return TwoFaVerifyResponse(
        two_fa_token=ticket, expires_in_hours=settings.two_fa_ticket_ttl_hours
    )


@router.get("/me", response_model=MeResponse)
@limiter.limit("300/minute")
async def get_me(request: Request, user: CurrentUser) -> MeResponse:
    if user is None:
        raise AppError("AUTH_001", "Not authenticated.", 401)
    return MeResponse.model_validate(user)


@router.post("/sync", response_model=SyncResponse, status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def sync_profile(
    request: Request, payload: SyncRequest, db: DbDep,
    subject: CurrentSubject, email: CurrentEmail,
) -> SyncResponse:
    """First-login upsert: link or create the profile row for a Supabase user."""
    user, created = await UserService(db).sync_profile(
        subject, email, payload.first_name, payload.last_name, payload.phone,
    )
    body = SyncResponse.model_validate(user)
    body.profile_complete = UserService.is_profile_complete(user)
    body.created = created
    return body
