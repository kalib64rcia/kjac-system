"""Catalog schemas (public reads + admin write)."""


from pydantic import BaseModel, ConfigDict, Field


def format_duration(minutes: int | None) -> str | None:
    """120 -> '2 hours', 90 -> '1-2 hours', 45 -> '45 minutes'."""
    if minutes is None:
        return None
    if minutes < 60:
        return f"{minutes} minutes"
    hours = minutes / 60
    if hours == int(hours):
        return f"{int(hours)} hour{'s' if hours != 1 else ''}"
    return f"{int(hours)}-{int(hours) + 1} hours"


class ServiceImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    image_url: str
    image_type: str | None = None
    caption: str | None = None


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str
    base_price: float
    down_payment_amount: float
    down_payment_type: str
    estimated_duration_minutes: int | None = None
    estimated_duration_display: str | None = None
    icon_name: str | None = None
    badge_text: str | None = None
    is_active: bool
    is_featured: bool
    images: list[ServiceImageOut] = Field(default_factory=list)


class ServiceDetailOut(ServiceOut):
    detailed_description: str | None = None
    process_steps: list | dict | None = None


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: str = Field(min_length=1)
    detailed_description: str | None = None
    base_price: float = Field(ge=0)
    down_payment_amount: float = Field(ge=0)
    down_payment_type: str = Field(default="fixed", pattern=r"^(fixed|percentage)$")
    estimated_duration_minutes: int | None = Field(default=None, gt=0)
    process_steps: list | dict | None = None
    icon_name: str | None = Field(default=None, max_length=50)
    badge_text: str | None = Field(default=None, max_length=50)
    badge_color: str | None = Field(default=None, max_length=20)
    display_order: int = 0
    is_active: bool = True
    is_featured: bool = False


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    detailed_description: str | None = None
    base_price: float | None = Field(default=None, ge=0)
    down_payment_amount: float | None = Field(default=None, ge=0)
    down_payment_type: str | None = Field(default=None, pattern=r"^(fixed|percentage)$")
    estimated_duration_minutes: int | None = Field(default=None, gt=0)
    process_steps: list | dict | None = None
    icon_name: str | None = Field(default=None, max_length=50)
    badge_text: str | None = Field(default=None, max_length=50)
    badge_color: str | None = Field(default=None, max_length=20)
    display_order: int | None = None
    is_active: bool | None = None
    is_featured: bool | None = None


class BrandImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    image_url: str
    image_type: str | None = None
    caption: str | None = None


class BrandOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None = None
    logo_url: str | None = None
    is_partner: bool
    badge_text: str | None = None
    is_active: bool
    images: list[BrandImageOut] = Field(default_factory=list)


class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    logo_url: str | None = None
    is_partner: bool = False
    badge_text: str | None = Field(default=None, max_length=50)
    badge_color: str | None = Field(default=None, max_length=20)
    display_order: int = 0
    is_active: bool = True


class BrandUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    logo_url: str | None = None
    is_partner: bool | None = None
    badge_text: str | None = Field(default=None, max_length=50)
    badge_color: str | None = Field(default=None, max_length=20)
    display_order: int | None = None
    is_active: bool | None = None
