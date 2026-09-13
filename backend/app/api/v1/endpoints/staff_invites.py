"""Staff invite endpoints: owner send/list/resend/revoke + public accept."""

from fastapi import APIRouter, Request, status

from app.api.deps import DbDep, OwnerTwoFaUser
from app.core.rate_limit import limiter
from app.schemas.staff_invite import (
    StaffInviteAccept,
    StaffInviteAcceptResponse,
    StaffInviteCreate,
    StaffInviteResponse,
)
from app.services import staff_invite_service as invites
from app.services.email_service import get_email_service

router = APIRouter(tags=["staff-invites"])


@router.post("/admin/staff-invites", response_model=StaffInviteResponse,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def send_invite(request: Request, payload: StaffInviteCreate, db: DbDep,
                      owner: OwnerTwoFaUser) -> StaffInviteResponse:
    row = await invites.send_invite(db, get_email_service(), owner, str(payload.email))
    return StaffInviteResponse.model_validate(row)


@router.get("/admin/staff-invites", response_model=list[StaffInviteResponse])
@limiter.limit("500/minute")
async def list_invites(request: Request, db: DbDep,
                       owner: OwnerTwoFaUser) -> list[StaffInviteResponse]:
    rows = await invites.list_invites(db)
    return [StaffInviteResponse.model_validate(r) for r in rows]


@router.post("/admin/staff-invites/{invite_id}/resend", response_model=StaffInviteResponse)
@limiter.limit("10/minute")
async def resend_invite(request: Request, invite_id: int, db: DbDep,
                        owner: OwnerTwoFaUser) -> StaffInviteResponse:
    row = await invites.resend_invite(db, get_email_service(), invite_id)
    return StaffInviteResponse.model_validate(row)


@router.post("/admin/staff-invites/{invite_id}/revoke", response_model=StaffInviteResponse)
@limiter.limit("60/minute")
async def revoke_invite(request: Request, invite_id: int, db: DbDep,
                        owner: OwnerTwoFaUser) -> StaffInviteResponse:
    row = await invites.revoke_invite(db, invite_id)
    return StaffInviteResponse.model_validate(row)


@router.post("/auth/staff/accept", response_model=StaffInviteAcceptResponse,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def accept_invite(request: Request, payload: StaffInviteAccept,
                        db: DbDep) -> StaffInviteAcceptResponse:
    user = await invites.accept_invite(db, payload.token, payload.model_dump())
    return StaffInviteAcceptResponse(id=user.id, status=user.status)


@router.get("/auth/staff/invite-state")
@limiter.limit("30/minute")
async def invite_state(request: Request, token: str, db: DbDep) -> dict:
    """Public resume probe: same token rules, no data beyond the step hint."""
    return await invites.invite_state(db, token)
