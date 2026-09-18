"""Catalog service: public reads (active only) + admin write with guards."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.catalog import AirconBrand, Service


async def list_entries(db: AsyncSession, model: Any, active_only: bool = True) -> list:
    query = select(model).where(model.deleted_at.is_(None))
    if active_only:
        query = query.where(model.is_active.is_(True))
    query = query.order_by(model.display_order, model.id)
    return list((await db.execute(query)).scalars())


async def get_entry_or_404(
    db: AsyncSession, model: Any, entry_id: int, noun: str
) -> Any:
    result = await db.execute(
        select(model).where(model.id == entry_id, model.deleted_at.is_(None))
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise AppError("BOOKING_005", f"{noun} not found.", 404)
    return row


async def create_entry(
    db: AsyncSession, model: Any, fields: dict, conflict_msg: str
) -> Any:
    row = model(**fields)
    db.add(row)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError("BOOKING_003", conflict_msg, 409) from exc
    await db.refresh(row)
    return row


async def update_entry(
    db: AsyncSession, model: Any, entry_id: int, fields: dict,
    nullable: set[str], noun: str, conflict_msg: str,
) -> Any:
    row = await get_entry_or_404(db, model, entry_id, noun)
    for key, value in fields.items():
        if value is not None or key in nullable:
            setattr(row, key, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError("BOOKING_003", conflict_msg, 409) from exc
    await db.refresh(row)
    return row


async def delete_entry(db: AsyncSession, model: Any, entry_id: int, noun: str) -> None:
    row = await get_entry_or_404(db, model, entry_id, noun)
    row.deleted_at = datetime.now(UTC)
    await db.commit()


NULLABLE_SERVICE_FIELDS = {
    "detailed_description", "badge_text", "badge_color", "icon_name",
    "estimated_duration_minutes", "process_steps",
}

NULLABLE_BRAND_FIELDS = {"description", "logo_url", "badge_text", "badge_color"}


async def list_services(db: AsyncSession, active_only: bool = True) -> list[Service]:
    return await list_entries(db, Service, active_only)


async def get_service_or_404(db: AsyncSession, service_id: int) -> Service:
    return await get_entry_or_404(db, Service, service_id, "Service")


async def create_service(db: AsyncSession, fields: dict) -> Service:
    return await create_entry(db, Service, fields, "Service slug already exists.")


async def update_service(db: AsyncSession, service_id: int, fields: dict) -> Service:
    return await update_entry(
        db, Service, service_id, fields, NULLABLE_SERVICE_FIELDS,
        "Service", "Service slug already exists.",
    )


async def delete_service(db: AsyncSession, service_id: int) -> None:
    await delete_entry(db, Service, service_id, "Service")


async def list_brands(db: AsyncSession, active_only: bool = True) -> list[AirconBrand]:
    return await list_entries(db, AirconBrand, active_only)


async def get_brand_or_404(db: AsyncSession, brand_id: int) -> AirconBrand:
    return await get_entry_or_404(db, AirconBrand, brand_id, "Brand")


async def create_brand(db: AsyncSession, fields: dict) -> AirconBrand:
    return await create_entry(db, AirconBrand, fields, "Brand name or slug already exists.")


async def update_brand(db: AsyncSession, brand_id: int, fields: dict) -> AirconBrand:
    return await update_entry(
        db, AirconBrand, brand_id, fields, NULLABLE_BRAND_FIELDS,
        "Brand", "Brand name or slug already exists.",
    )


async def delete_brand(db: AsyncSession, brand_id: int) -> None:
    await delete_entry(db, AirconBrand, brand_id, "Brand")
