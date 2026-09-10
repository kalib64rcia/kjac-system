"""Payment + PSGC schemas."""

from pydantic import BaseModel, ConfigDict, Field


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    payment_type: str
    amount: float
    payment_method: str | None = None
    gcash_reference_number: str | None = None
    status: str


class PaymentVerifyRequest(BaseModel):
    action: str = Field(pattern=r"^(approve|reject)$")
    rejection_reason: str | None = Field(default=None, max_length=1000)


class PsgcItem(BaseModel):
    code: str
    name: str
