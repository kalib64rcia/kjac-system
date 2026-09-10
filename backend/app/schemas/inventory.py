"""Inventory schemas."""

from pydantic import BaseModel, ConfigDict, Field


class InventoryItemCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=50)
    item_type: str = Field(pattern=r"^(aircon_unit|replacement_part|tool|consumable)$")
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    brand_id: int | None = None
    model_number: str | None = Field(default=None, max_length=100)
    part_number: str | None = Field(default=None, max_length=100)
    quantity: int = Field(default=0, ge=0)
    minimum_stock_level: int = Field(default=10, ge=0)
    unit_of_measure: str = Field(default="piece", max_length=20)
    unit_cost: float = Field(ge=0)
    selling_price: float | None = Field(default=None, ge=0)
    storage_location: str | None = Field(default=None, max_length=100)


class InventoryItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    minimum_stock_level: int | None = Field(default=None, ge=0)
    unit_cost: float | None = Field(default=None, ge=0)
    selling_price: float | None = Field(default=None, ge=0)
    storage_location: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None


class InventoryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    qr_code: str | None = None
    item_type: str
    name: str
    quantity: int
    minimum_stock_level: int
    unit_cost: float
    selling_price: float | None = None
    is_active: bool


class InventoryListResponse(BaseModel):
    total: int
    items: list[InventoryItemResponse]


class StockAdjust(BaseModel):
    movement_type: str = Field(
        pattern=r"^(stock_in|stock_out|adjustment|transfer|damaged|returned)$"
    )
    quantity: int = Field(description="Signed change, e.g. +10 or -2")
    reason: str | None = Field(default=None, max_length=500)
    booking_id: int | None = None
    reference_number: str | None = Field(default=None, max_length=100)


class MovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inventory_item_id: int
    movement_type: str
    quantity: int
    previous_quantity: int
    new_quantity: int


class MovementListResponse(BaseModel):
    total: int
    items: list[MovementResponse]
