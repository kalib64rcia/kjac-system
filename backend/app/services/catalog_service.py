"""Catalog service: public reads (active only) + admin write with guards."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.catalog import AirconBrand, Service


async def list_services(db: AsyncSession, active_only: bool = True) -> list[Service]:
    query = select(Service).where(Service.deleted_at.is_(None))
    if active_only:
        query = query.where(Service.is_active.is_(True))
    query = query.order_by(Service.display_order, Service.id)
    return list((await db.execute(query)).scalars())


async def get_service_or_404(db: AsyncSession, service_id: int) -> Service:
    result = await db.execute(
        select(Service).where(Service.id == service_id, Service.deleted_at.is_(None))
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise AppError("BOOKING_005", "Service not found.", 404)
    return row


async def create_service(db: AsyncSession, fields: dict) -> Service:
    row = Service(**fields)
    db.add(row)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError("BOOKING_003", "Service slug already exists.", 409) from exc
    await db.refresh(row)
    return row


NULLABLE_SERVICE_FIELDS = {
    "detailed_description", "badge_text", "badge_color", "icon_name",
    "estimated_duration_minutes", "process_steps",
}


async def update_service(db: AsyncSession, service_id: int, fields: dict) -> Service:
    row = await get_service_or_404(db, service_id)
    for key, value in fields.items():
        if value is not None or key in NULLABLE_SERVICE_FIELDS:
            setattr(row, key, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError("BOOKING_003", "Service slug already exists.", 409) from exc
    await db.refresh(row)
    return row


async def delete_service(db: AsyncSession, service_id: int) -> None:
    from datetime import UTC, datetime

    row = await get_service_or_404(db, service_id)
    row.deleted_at = datetime.now(UTC)
    await db.commit()


async def list_brands(db: AsyncSession, active_only: bool = True) -> list[AirconBrand]:
    query = select(AirconBrand).where(AirconBrand.deleted_at.is_(None))
    if active_only:
        query = query.where(AirconBrand.is_active.is_(True))
    query = query.order_by(AirconBrand.display_order, AirconBrand.id)
    return list((await db.execute(query)).scalars())


async def get_brand_or_404(db: AsyncSession, brand_id: int) -> AirconBrand:
    result = await db.execute(
        select(AirconBrand).where(
            AirconBrand.id == brand_id, AirconBrand.deleted_at.is_(None)
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise AppError("BOOKING_005", "Brand not found.", 404)
    return row


async def create_brand(db: AsyncSession, fields: dict) -> AirconBrand:
    row = AirconBrand(**fields)
    db.add(row)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError("BOOKING_003", "Brand name or slug already exists.", 409) from exc
    await db.refresh(row)
    return row


NULLABLE_BRAND_FIELDS = {"description", "logo_url", "badge_text", "badge_color"}


async def update_brand(db: AsyncSession, brand_id: int, fields: dict) -> AirconBrand:
    row = await get_brand_or_404(db, brand_id)
    for key, value in fields.items():
        if value is not None or key in NULLABLE_BRAND_FIELDS:
            setattr(row, key, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError("BOOKING_003", "Brand name or slug already exists.", 409) from exc
    await db.refresh(row)
    return row


async def delete_brand(db: AsyncSession, brand_id: int) -> None:
    from datetime import UTC, datetime

    row = await get_brand_or_404(db, brand_id)
    row.deleted_at = datetime.now(UTC)
    await db.commit()
