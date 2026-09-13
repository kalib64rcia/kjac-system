"""Technician invite endpoints: admin send/list/resend/revoke + public accept."""

from fastapi import APIRouter, Request, status

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.rate_limit import limiter
from app.schemas.tech_invite import (
    InviteAccept,
    InviteAcceptResponse,
    InviteCreate,
    InviteResponse,
)
from app.services import tech_invite_service as invites
from app.services.email_service import get_email_service

router = APIRouter(tags=["tech-invites"])


@router.post("/admin/tech-invites", response_model=InviteResponse,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def send_invite(request: Request, payload: InviteCreate, db: DbDep,
                      admin: AdminTwoFaUser) -> InviteResponse:
    row = await invites.send_invite(db, get_email_service(), admin, str(payload.email))
    return InviteResponse.model_validate(row)


@router.get("/admin/tech-invites", response_model=list[InviteResponse])
@limiter.limit("500/minute")
async def list_invites(request: Request, db: DbDep,
                       admin: AdminTwoFaUser) -> list[InviteResponse]:
    rows = await invites.list_invites(db)
    return [InviteResponse.model_validate(r) for r in rows]


@router.post("/admin/tech-invites/{invite_id}/resend", response_model=InviteResponse)
@limiter.limit("10/minute")
async def resend_invite(request: Request, invite_id: int, db: DbDep,
                        admin: AdminTwoFaUser) -> InviteResponse:
    row = await invites.resend_invite(db, get_email_service(), invite_id)
    return InviteResponse.model_validate(row)


@router.post("/admin/tech-invites/{invite_id}/revoke", response_model=InviteResponse)
@limiter.limit("60/minute")
async def revoke_invite(request: Request, invite_id: int, db: DbDep,
                        admin: AdminTwoFaUser) -> InviteResponse:
    row = await invites.revoke_invite(db, invite_id)
    return InviteResponse.model_validate(row)


@router.post("/auth/technician/accept", response_model=InviteAcceptResponse,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def accept_invite(request: Request, payload: InviteAccept,
                        db: DbDep) -> InviteAcceptResponse:
    user = await invites.accept_invite(db, payload.token, payload.model_dump())
    return InviteAcceptResponse(id=user.id, status=user.status)


@router.get("/auth/technician/invite-state")
@limiter.limit("30/minute")
async def invite_state(request: Request, token: str, db: DbDep) -> dict:
    """Public resume probe: same token rules, no data beyond the step hint."""
    return await invites.invite_state(db, token)
