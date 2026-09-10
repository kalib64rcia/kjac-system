"""Catalog endpoints: public reads + admin write (TwoFa)."""

from fastapi import APIRouter, Query, Request, status

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.rate_limit import limiter
from app.schemas.catalog import (
    BrandCreate,
    BrandOut,
    BrandUpdate,
    ServiceCreate,
    ServiceDetailOut,
    ServiceOut,
    ServiceUpdate,
    format_duration,
)
from app.services import catalog_service as catalog

router = APIRouter(tags=["catalog"])


def _service_out(row) -> ServiceOut:
    body = ServiceOut.model_validate(row)
    body.estimated_duration_display = format_duration(row.estimated_duration_minutes)
    return body


def _service_detail_out(row) -> ServiceDetailOut:
    body = ServiceDetailOut.model_validate(row)
    body.estimated_duration_display = format_duration(row.estimated_duration_minutes)
    return body


@router.get("/services", response_model=list[ServiceOut])
@limiter.limit("100/minute")
async def get_services(
    request: Request, db: DbDep,
    is_active: bool = Query(default=True),
) -> list[ServiceOut]:
    rows = await catalog.list_services(db, active_only=is_active)
    return [_service_out(r) for r in rows]


@router.get("/services/{service_id}", response_model=ServiceDetailOut)
@limiter.limit("100/minute")
async def get_service(request: Request, service_id: int, db: DbDep) -> ServiceDetailOut:
    return _service_detail_out(await catalog.get_service_or_404(db, service_id))


@router.post("/admin/services", response_model=ServiceDetailOut,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def create_service(request: Request, payload: ServiceCreate, db: DbDep,
                         admin: AdminTwoFaUser) -> ServiceDetailOut:
    row = await catalog.create_service(db, payload.model_dump())
    return _service_detail_out(row)


@router.get("/admin/services", response_model=list[ServiceDetailOut])
@limiter.limit("500/minute")
async def list_all_services(request: Request, db: DbDep,
                            admin: AdminTwoFaUser) -> list[ServiceDetailOut]:
    rows = await catalog.list_services(db, active_only=False)
    return [_service_detail_out(r) for r in rows]


@router.patch("/admin/services/{service_id}", response_model=ServiceDetailOut)
@limiter.limit("60/minute")
async def update_service(request: Request, service_id: int, payload: ServiceUpdate,
                         db: DbDep, admin: AdminTwoFaUser) -> ServiceDetailOut:
    row = await catalog.update_service(
        db, service_id, payload.model_dump(exclude_unset=True)
    )
    return _service_detail_out(row)


@router.delete("/admin/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def delete_service(request: Request, service_id: int, db: DbDep,
                         admin: AdminTwoFaUser) -> None:
    await catalog.delete_service(db, service_id)


@router.get("/brands", response_model=list[BrandOut])
@limiter.limit("100/minute")
async def get_brands(
    request: Request, db: DbDep,
    is_active: bool = Query(default=True),
) -> list[BrandOut]:
    rows = await catalog.list_brands(db, active_only=is_active)
    return [BrandOut.model_validate(r) for r in rows]


@router.get("/brands/{brand_id}", response_model=BrandOut)
@limiter.limit("100/minute")
async def get_brand(request: Request, brand_id: int, db: DbDep) -> BrandOut:
    return BrandOut.model_validate(await catalog.get_brand_or_404(db, brand_id))


@router.post("/admin/brands", response_model=BrandOut,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def create_brand(request: Request, payload: BrandCreate, db: DbDep,
                       admin: AdminTwoFaUser) -> BrandOut:
    row = await catalog.create_brand(db, payload.model_dump())
    return BrandOut.model_validate(row)


@router.get("/admin/brands", response_model=list[BrandOut])
@limiter.limit("500/minute")
async def list_all_brands(request: Request, db: DbDep,
                          admin: AdminTwoFaUser) -> list[BrandOut]:
    rows = await catalog.list_brands(db, active_only=False)
    return [BrandOut.model_validate(r) for r in rows]


@router.patch("/admin/brands/{brand_id}", response_model=BrandOut)
@limiter.limit("60/minute")
async def update_brand(request: Request, brand_id: int, payload: BrandUpdate,
                       db: DbDep, admin: AdminTwoFaUser) -> BrandOut:
    row = await catalog.update_brand(db, brand_id, payload.model_dump(exclude_unset=True))
    return BrandOut.model_validate(row)


@router.delete("/admin/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def delete_brand(request: Request, brand_id: int, db: DbDep,
                       admin: AdminTwoFaUser) -> None:
    await catalog.delete_brand(db, brand_id)
