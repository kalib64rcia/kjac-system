"""PSGC proxy: upstream psgc.cloud with TTL cache + opportunistic DB upsert.

Upstream shape (verified live): [{name, code}] at /regions,
/regions/{code}/provinces, /provinces/{code}/cities-municipalities,
/cities-municipalities/{code}/barangays. Parsing is tolerant of key variants.
"""

import logging
import time

import httpx
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.psgc import (
    PsgcBarangay,
    PsgcCityMunicipality,
    PsgcProvince,
    PsgcRegion,
)

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[float, list[dict]]] = {}


def _cache_get(key: str) -> list[dict] | None:
    hit = _cache.get(key)
    if hit and hit[0] > time.monotonic():
        return hit[1]
    return None


def _cache_set(key: str, value: list[dict]) -> None:
    _cache[key] = (time.monotonic() + settings.psgc_cache_ttl_seconds, value)


def _repair(value: str) -> str:
    """Fix double-encoded names from upstream (e.g. "ParaÃ±aque" → "Parañaque").

    Upstream stores some names as UTF-8 bytes read as Latin-1. Reversing
    that is a fixed point for clean text: plain names come back identical,
    so this is safe to run on every name.
    """
    try:
        return value.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value


def _parse(items: object) -> list[dict]:
    parsed = []
    if not isinstance(items, list):
        return parsed
    for item in items:
        if not isinstance(item, dict):
            continue
        code = item.get("code") or item.get("psgcCode")
        name = item.get("name")
        if not code or not name:
            continue
        parsed.append(
            {
                "code": str(code),
                "name": _repair(str(name)),
                "is_city": bool(item.get("isCity", item.get("is_city", False))),
            }
        )
    return parsed


async def _fetch(path: str) -> list[dict]:
    cached = _cache_get(path)
    if cached is not None:
        return cached
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{settings.psgc_base_url}{path}")
        response.raise_for_status()
        parsed = _parse(response.json())
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("psgc upstream failed (%s): %s", path, exc)
        raise AppError("BOOKING_005", "Address service unavailable. Retry shortly.", 503) from exc
    _cache_set(path, parsed)
    return parsed


async def _upsert_regions(db: AsyncSession, rows: list[dict]) -> None:
    for row in rows:
        await db.execute(
            insert(PsgcRegion)
            .values(region_code=row["code"], region_name=row["name"], is_active=True)
            .on_conflict_do_update(
                index_elements=["region_code"],
                set_={"region_name": row["name"], "is_active": True},
            )
        )


async def _upsert_provinces(db: AsyncSession, rows: list[dict], region_code: str) -> None:
    for row in rows:
        await db.execute(
            insert(PsgcProvince)
            .values(
                province_code=row["code"], province_name=row["name"],
                region_code=region_code, is_active=True,
            )
            .on_conflict_do_update(
                index_elements=["province_code"],
                set_={"province_name": row["name"], "is_active": True},
            )
        )


async def _upsert_cities(
    db: AsyncSession, rows: list[dict], province_code: str
) -> None:
    for row in rows:
        await db.execute(
            insert(PsgcCityMunicipality)
            .values(
                city_municipality_code=row["code"],
                city_municipality_name=row["name"],
                province_code=province_code, is_city=row["is_city"], is_active=True,
            )
            .on_conflict_do_update(
                index_elements=["city_municipality_code"],
                set_={"city_municipality_name": row["name"], "is_active": True},
            )
        )


async def _upsert_barangays(
    db: AsyncSession, rows: list[dict], city_code: str
) -> None:
    for row in rows:
        await db.execute(
            insert(PsgcBarangay)
            .values(
                barangay_code=row["code"], barangay_name=row["name"],
                city_municipality_code=city_code, is_active=True,
            )
            .on_conflict_do_update(
                index_elements=["barangay_code"],
                set_={"barangay_name": row["name"], "is_active": True},
            )
        )


async def list_regions(db: AsyncSession) -> list[dict]:
    rows = await _fetch("/regions")
    try:
        await _upsert_regions(db, rows)
        await db.commit()
    except SQLAlchemyError as exc:  # cache best-effort; upstream data already served
        await db.rollback()
        logger.warning("psgc region upsert skipped: %s", exc)
    return [{"code": r["code"], "name": r["name"]} for r in rows]


async def list_provinces(db: AsyncSession, region_code: str) -> list[dict]:
    rows = await _fetch(f"/regions/{region_code}/provinces")
    try:
        await _upsert_provinces(db, rows, region_code)
        await db.commit()
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.warning("psgc province upsert skipped: %s", exc)
    return [{"code": r["code"], "name": r["name"]} for r in rows]


async def list_cities(db: AsyncSession, province_code: str) -> list[dict]:
    rows = await _fetch(f"/provinces/{province_code}/cities-municipalities")
    try:
        await _upsert_cities(db, rows, province_code)
        await db.commit()
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.warning("psgc city upsert skipped: %s", exc)
    return [{"code": r["code"], "name": r["name"]} for r in rows]


async def list_cities_by_region(db: AsyncSession, region_code: str) -> list[dict]:
    """Cities straight from a region (e.g. NCR has no provinces).

    Served from upstream only: the cities table needs a province code
    that region-level cities don't have, so there is nothing to upsert.
    """
    _ = db
    rows = await _fetch(f"/regions/{region_code}/cities-municipalities")
    return [{"code": r["code"], "name": r["name"]} for r in rows]


async def list_barangays(db: AsyncSession, city_code: str) -> list[dict]:
    rows = await _fetch(f"/cities-municipalities/{city_code}/barangays")
    try:
        await _upsert_barangays(db, rows, city_code)
        await db.commit()
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.warning("psgc barangay upsert skipped: %s", exc)
    return [{"code": r["code"], "name": r["name"]} for r in rows]
