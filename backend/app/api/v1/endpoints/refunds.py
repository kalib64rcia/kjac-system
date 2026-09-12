"""Refund endpoints: office proposes/lists, owner (or delegated staff) reviews."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import AdminTwoFaUser, DbDep, grants
from app.core.rate_limit import limiter
from app.models.users import User
from app.services import refund_service as refunds

router = APIRouter(tags=["refunds"])


class RefundPropose(BaseModel):
    booking_id: int = Field(gt=0)
    payment_id: int = Field(gt=0)
    refund_amount: float = Field(gt=0)
    reason: str = Field(min_length=1, max_length=1000)


class RefundReview(BaseModel):
    action: str = Field(pattern=r"^(approve|deny)$")
    admin_notes: str | None = Field(default=None, max_length=1000)
    denial_reason: str | None = Field(default=None, max_length=1000)


class RefundOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    payment_id: int
    refund_amount: float
    reason: str
    status: str
    admin_notes: str | None = None
    denial_reason: str | None = None
    processed_at: datetime | None = None
    created_at: datetime


class RefundListResponse(BaseModel):
    total: int
    items: list[RefundOut]


@router.post("/admin/refunds", response_model=RefundOut,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def propose_refund(request: Request, payload: RefundPropose, db: DbDep,
                         user: AdminTwoFaUser) -> RefundOut:
    row = await refunds.propose(
        db, user, payload.booking_id, payload.payment_id,
        payload.refund_amount, payload.reason,
    )
    return RefundOut.model_validate(row)


@router.get("/admin/refunds", response_model=RefundListResponse)
@limiter.limit("300/minute")
async def list_refunds(
    request: Request, db: DbDep, user: AdminTwoFaUser,
    refund_status: str | None = Query(default=None, max_length=20, alias="status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> RefundListResponse:
    total, rows = await refunds.list_refunds(db, refund_status, page, limit)
    return RefundListResponse(
        total=total, items=[RefundOut.model_validate(r) for r in rows]
    )


@router.post("/admin/refunds/{refund_id}/review", response_model=RefundOut)
@limiter.limit("60/minute")
async def review_refund(
    request: Request, refund_id: int, payload: RefundReview, db: DbDep,
    reviewer: Annotated[User, Depends(grants("can_execute_refunds"))],
) -> RefundOut:
    # grants(): owners always pass; staff need can_execute_refunds.
    row = await refunds.review(
        db, reviewer, refund_id, payload.action == "approve",
        payload.admin_notes, payload.denial_reason,
    )
    return RefundOut.model_validate(row)
