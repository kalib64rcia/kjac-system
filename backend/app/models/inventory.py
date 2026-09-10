"""Inventory models — user_id nullable (fixes NOT NULL + SET NULL contradiction)."""

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import created_at_column, deleted_at_column, pk_column, updated_at_column


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[int] = pk_column()
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    qr_code: Mapped[str | None] = mapped_column(String(100), unique=True)
    barcode: Mapped[str | None] = mapped_column(String(100))

    item_type: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    brand_id: Mapped[int | None] = mapped_column(
        ForeignKey("aircon_brands.id", ondelete="SET NULL")
    )
    model_number: Mapped[str | None] = mapped_column(String(100))

    part_number: Mapped[str | None] = mapped_column(String(100))
    compatible_brands: Mapped[list[str] | None] = mapped_column(ARRAY(Text))

    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    minimum_stock_level: Mapped[int] = mapped_column(Integer, default=10)
    unit_of_measure: Mapped[str] = mapped_column(String(20), default="piece")

    unit_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    selling_price: Mapped[float | None] = mapped_column(Numeric(10, 2))

    storage_location: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    image_url: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()
    deleted_at: Mapped[datetime | None] = deleted_at_column()

    __table_args__ = (
        CheckConstraint(
            "item_type IN ('aircon_unit', 'replacement_part', 'tool', 'consumable')",
            name="chk_inventory_type_valid",
        ),
        CheckConstraint("quantity >= 0", name="chk_inventory_quantity"),
        CheckConstraint("unit_cost >= 0", name="chk_inventory_unit_cost"),
        CheckConstraint("selling_price >= 0", name="chk_inventory_selling_price"),
    )


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[int] = pk_column()
    inventory_item_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_items.id", ondelete="RESTRICT"), nullable=False
    )
    # Nullable: SET NULL on user delete requires it (fixes docs contradiction R3)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    booking_id: Mapped[int | None] = mapped_column(
        ForeignKey("bookings.id", ondelete="SET NULL")
    )

    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    previous_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    new_quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    reason: Mapped[str | None] = mapped_column(Text)
    reference_number: Mapped[str | None] = mapped_column(String(100))

    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        CheckConstraint(
            "movement_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', "
            "'damaged', 'returned')",
            name="chk_movements_type_valid",
        ),
    )


class BookingInventoryUsage(Base):
    __tablename__ = "booking_inventory_usage"

    id: Mapped[int] = pk_column()
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    inventory_item_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_items.id", ondelete="RESTRICT"), nullable=False
    )

    quantity_used: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = created_at_column()

    __table_args__ = (
        CheckConstraint("quantity_used > 0", name="chk_usage_quantity_positive"),
    )
