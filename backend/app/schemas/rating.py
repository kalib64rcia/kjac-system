"""Rating schemas."""

from pydantic import BaseModel, ConfigDict, Field


class RatingCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    review_text: str | None = Field(default=None, max_length=2000)
    email: str | None = Field(default=None, max_length=255)  # guest proof


class RatingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    customer_id: int
    technician_id: int
    rating: int
    review_text: str | None = None


class PublicRatingItem(BaseModel):
    """Technician wall: stars + words only (no internal linkage ids)."""

    model_config = ConfigDict(from_attributes=True)

    rating: int
    review_text: str | None = None


class TechnicianRatingsResponse(BaseModel):
    technician_id: int
    average_rating: float
    total: int
    items: list[PublicRatingItem]
