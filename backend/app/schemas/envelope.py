"""Envelope schemas matching docs/api/API.md success/error shape."""

from typing import Any

from pydantic import BaseModel, Field


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool


class SuccessMeta(BaseModel):
    timestamp: str
    request_id: str | None = None
    pagination: PaginationMeta | None = None


class SuccessEnvelope(BaseModel):
    success: bool = True
    data: Any
    meta: SuccessMeta
    message: str | None = None


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)


class ErrorEnvelope(BaseModel):
    success: bool = False
    error: ErrorBody
    meta: SuccessMeta
