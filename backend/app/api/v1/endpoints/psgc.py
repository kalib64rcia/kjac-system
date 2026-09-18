"""PSGC address lookup (public, cached proxy with DB upsert)."""

from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.api.deps import DbDep
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.schemas.payment import PsgcItem
from app.services import psgc_service as psgc

router = APIRouter(prefix="/psgc", tags=["psgc"])


@router.get("/regions", response_model=list[PsgcItem])
@limiter.limit("100/minute")
async def get_regions(request: Request, db: DbDep) -> list[PsgcItem]:
    return [PsgcItem.model_validate(r) for r in await psgc.list_regions(db)]


@router.get("/provinces", response_model=list[PsgcItem])
@limiter.limit("100/minute")
async def get_provinces(
    request: Request, db: DbDep, region_code: str = Query(..., max_length=20)
) -> list[PsgcItem]:
    return [PsgcItem.model_validate(r) for r in await psgc.list_provinces(db, region_code)]


@router.get("/cities", response_model=list[PsgcItem])
@limiter.limit("100/minute")
async def get_cities(
    request: Request,
    db: DbDep,
    province_code: Annotated[str | None, Query(max_length=20)] = None,
    region_code: Annotated[str | None, Query(max_length=20)] = None,
) -> list[PsgcItem]:
    if province_code:
        rows = await psgc.list_cities(db, province_code)
    elif region_code:
        rows = await psgc.list_cities_by_region(db, region_code)
    else:
        raise AppError("VAL_001", "Give a province or a region.", 422)
    return [PsgcItem.model_validate(r) for r in rows]


@router.get("/barangays", response_model=list[PsgcItem])
@limiter.limit("100/minute")
async def get_barangays(
    request: Request, db: DbDep, city_municipality_code: str = Query(..., max_length=20)
) -> list[PsgcItem]:
    return [
        PsgcItem.model_validate(r)
        for r in await psgc.list_barangays(db, city_municipality_code)
    ]
