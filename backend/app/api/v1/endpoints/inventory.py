"""Inventory admin endpoints."""

from fastapi import APIRouter, Query, Request, status

from app.api.deps import AdminTwoFaUser, DbDep
from app.core.rate_limit import limiter
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
    InventoryListResponse,
    MovementListResponse,
    MovementResponse,
    StockAdjust,
)
from app.services import inventory_service as inventory

router = APIRouter(prefix="/admin/inventory", tags=["admin-inventory"])


@router.get("", response_model=InventoryListResponse)
@limiter.limit("500/minute")
async def search_items(
    request: Request, db: DbDep, admin: AdminTwoFaUser,
    search: str | None = Query(default=None, max_length=100),
    item_type: str | None = Query(default=None, max_length=20),
    low_stock: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> InventoryListResponse:
    total, rows = await inventory.list_items(db, search, item_type, low_stock, page, limit)
    return InventoryListResponse(
        total=total, items=[InventoryItemResponse.model_validate(r) for r in rows]
    )


@router.post("", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def add_item(request: Request, payload: InventoryItemCreate, db: DbDep,
                   admin: AdminTwoFaUser) -> InventoryItemResponse:
    row = await inventory.create_item(db, **payload.model_dump())
    return InventoryItemResponse.model_validate(row)


@router.patch("/{item_id}", response_model=InventoryItemResponse)
@limiter.limit("60/minute")
async def edit_item(request: Request, item_id: int, payload: InventoryItemUpdate,
                    db: DbDep, admin: AdminTwoFaUser) -> InventoryItemResponse:
    row = await inventory.update_item(db, item_id, payload.model_dump(exclude_unset=True))
    return InventoryItemResponse.model_validate(row)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def remove_item(request: Request, item_id: int, db: DbDep,
                      admin: AdminTwoFaUser) -> None:
    await inventory.delete_item(db, item_id)


@router.post("/{item_id}/adjust", response_model=MovementResponse,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def adjust_item(request: Request, item_id: int, payload: StockAdjust,
                      db: DbDep, admin: AdminTwoFaUser) -> MovementResponse:
    row = await inventory.adjust_stock(
        db, item_id, admin.id, payload.movement_type, payload.quantity,
        payload.reason, payload.booking_id, payload.reference_number,
    )
    return MovementResponse.model_validate(row)


@router.get("/movements/list", response_model=MovementListResponse)
@limiter.limit("500/minute")
async def search_movements(
    request: Request, db: DbDep, admin: AdminTwoFaUser,
    item_id: int | None = Query(default=None, gt=0),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> MovementListResponse:
    total, rows = await inventory.list_movements(db, item_id, page, limit)
    return MovementListResponse(
        total=total, items=[MovementResponse.model_validate(r) for r in rows]
    )
