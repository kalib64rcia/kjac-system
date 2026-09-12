"""Payroll admin endpoints + employee self-service reads."""

from fastapi import APIRouter, Query, Request, status

from app.api.deps import CurrentUser, DbDep, OwnerTwoFaUser
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.schemas.payroll import (
    PayrollGenerate,
    PayrollListResponse,
    PayrollResponse,
    PayrollTransition,
)
from app.services import payroll_service as payroll

router = APIRouter(tags=["payroll"])


@router.post("/admin/payroll/generate", response_model=PayrollResponse,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def generate(request: Request, payload: PayrollGenerate, db: DbDep,
                   owner: OwnerTwoFaUser) -> PayrollResponse:
    row = await payroll.generate_payroll(db, owner.id, **payload.model_dump())
    return PayrollResponse.model_validate(row)


@router.get("/admin/payroll", response_model=PayrollListResponse)
@limiter.limit("500/minute")
async def search_payrolls(
    request: Request, db: DbDep, owner: OwnerTwoFaUser,
    employee_user_id: int | None = Query(default=None, gt=0),
    payroll_status: str | None = Query(default=None, max_length=20),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> PayrollListResponse:
    total, rows = await payroll.list_payrolls(db, employee_user_id, payroll_status,
                                              page, limit)
    return PayrollListResponse(
        total=total, items=[PayrollResponse.model_validate(r) for r in rows]
    )


@router.get("/admin/payroll/{payroll_id}", response_model=PayrollResponse)
@limiter.limit("500/minute")
async def get_payroll(request: Request, payroll_id: int, db: DbDep,
                      owner: OwnerTwoFaUser) -> PayrollResponse:
    from app.models.hr import PayrollRecord

    row = await db.get(PayrollRecord, payroll_id)
    if row is None:
        raise AppError("BOOKING_001", "Payroll record not found.", 404)
    return PayrollResponse.model_validate(row)


@router.patch("/admin/payroll/{payroll_id}", response_model=PayrollResponse)
@limiter.limit("60/minute")
async def transition(request: Request, payroll_id: int, payload: PayrollTransition,
                     db: DbDep, owner: OwnerTwoFaUser) -> PayrollResponse:
    row = await payroll.transition_payroll(db, payroll_id, payload.action,
                                           payload.payment_method)
    return PayrollResponse.model_validate(row)


@router.get("/payroll/me", response_model=PayrollListResponse)
@limiter.limit("300/minute")
async def my_payroll(
    request: Request, db: DbDep, user: CurrentUser,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> PayrollListResponse:
    if user is None:
        raise AppError("AUTH_001", "Not authenticated.", 401)
    total, rows = await payroll.list_payrolls(db, user.id, None, page, limit)
    return PayrollListResponse(
        total=total, items=[PayrollResponse.model_validate(r) for r in rows]
    )
