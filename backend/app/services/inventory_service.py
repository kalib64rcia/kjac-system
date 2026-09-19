"""Inventory: items CRUD + guarded stock adjustments.

Adjustments compute previous/new server-side and refuse results below zero
(R5). Quantity sync + low-stock alerts run in the DB trigger; the service
only validates intent.
"""

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.bookings import Booking
from app.models.inventory import InventoryItem, InventoryMovement


async def list_items(
    db: AsyncSession, search: str | None, item_type: str | None,
    low_stock: bool, page: int, limit: int,
    sort_by: str = "newest", sort_dir: str = "desc",
) -> tuple[int, list[InventoryItem]]:
    query = select(InventoryItem).where(InventoryItem.deleted_at.is_(None))
    if search:
        query = query.where(InventoryItem.name.ilike(f"%{search}%"))
    if item_type:
        query = query.where(InventoryItem.item_type == item_type)
    if low_stock:
        query = query.where(InventoryItem.quantity <= InventoryItem.minimum_stock_level)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    column = {
        "name": InventoryItem.name,
        "quantity": InventoryItem.quantity,
        "newest": InventoryItem.id,
    }.get(sort_by, InventoryItem.id)
    ordering = column.desc() if sort_dir == "desc" else column.asc()
    rows = (
        await db.execute(query.order_by(ordering).offset((page - 1) * limit).limit(limit))
    ).scalars()
    return total, list(rows)


async def create_item(db: AsyncSession, **fields) -> InventoryItem:
    row = InventoryItem(**fields)
    db.add(row)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError("BOOKING_005", "SKU already exists.", 409) from exc
    await db.refresh(row)
    return row


async def get_item_or_404(db: AsyncSession, item_id: int) -> InventoryItem:
    row = await db.get(InventoryItem, item_id)
    if row is None or row.deleted_at is not None:
        raise AppError("BOOKING_001", "Inventory item not found.", 404)
    return row


async def update_item(db: AsyncSession, item_id: int, fields: dict) -> InventoryItem:
    row = await get_item_or_404(db, item_id)
    for key, value in fields.items():
        if value is not None:
            setattr(row, key, value)
    await db.commit()
    await db.refresh(row)
    return row


async def delete_item(db: AsyncSession, item_id: int) -> None:
    from datetime import UTC, datetime

    row = await get_item_or_404(db, item_id)
    row.deleted_at = datetime.now(UTC)
    await db.commit()


async def adjust_stock(
    db: AsyncSession, item_id: int, user_id: int, movement_type: str,
    quantity: int, reason: str | None, booking_id: int | None,
    reference_number: str | None,
) -> InventoryMovement:
    """Apply a signed quantity change. Result must stay >= 0."""
    if quantity == 0:
        raise AppError("VAL_001", "Quantity change cannot be zero.", 422)
    item = await get_item_or_404(db, item_id)
    if booking_id is not None:
        booking = await db.get(Booking, booking_id)
        if booking is None:
            raise AppError("BOOKING_001", "Booking not found.", 404)
    new_quantity = item.quantity + quantity
    if new_quantity < 0:
        raise AppError(
            "BOOKING_003",
            f"Insufficient stock (have {item.quantity}, change {quantity:+d}).", 409,
        )
    row = InventoryMovement(
        inventory_item_id=item.id, user_id=user_id, booking_id=booking_id,
        movement_type=movement_type, quantity=quantity,
        previous_quantity=item.quantity, new_quantity=new_quantity,
        reason=reason, reference_number=reference_number,
    )
    db.add(row)
    await db.commit()  # trigger syncs items.quantity + low-stock alert
    await db.refresh(row)
    return row


async def list_movements(
    db: AsyncSession, item_id: int | None, page: int, limit: int
) -> tuple[int, list[InventoryMovement]]:
    query = select(InventoryMovement)
    if item_id is not None:
        query = query.where(InventoryMovement.inventory_item_id == item_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    rows = (
        await db.execute(
            query.order_by(InventoryMovement.id.desc())
            .offset((page - 1) * limit).limit(limit)
        )
    ).scalars()
    return total, list(rows)
