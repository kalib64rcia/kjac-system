"""Service catalog models (services, brands + images)."""

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.common import created_at_column, deleted_at_column, pk_column, updated_at_column


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = pk_column()
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    detailed_description: Mapped[str | None] = mapped_column(Text)

    base_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    down_payment_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    down_payment_type: Mapped[str] = mapped_column(String(20), nullable=False, default="fixed")

    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer)
    process_steps: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSONB)

    icon_name: Mapped[str | None] = mapped_column(String(50))
    badge_text: Mapped[str | None] = mapped_column(String(50))
    badge_color: Mapped[str | None] = mapped_column(String(20))
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()
    deleted_at: Mapped[datetime | None] = deleted_at_column()

    images: Mapped[list["ServiceImage"]] = relationship(
        back_populates="service", lazy="selectin",
        order_by="ServiceImage.display_order",
    )

    __table_args__ = (
        CheckConstraint("base_price >= 0", name="chk_services_base_price"),
        CheckConstraint("down_payment_amount >= 0", name="chk_services_down_payment"),
        CheckConstraint(
            "down_payment_type IN ('fixed', 'percentage')", name="chk_services_down_payment_type"
        ),
    )


class ServiceImage(Base):
    __tablename__ = "service_images"

    id: Mapped[int] = pk_column()
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"))
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    image_type: Mapped[str | None] = mapped_column(String(20))
    caption: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = created_at_column()

    service: Mapped["Service"] = relationship(back_populates="images")

    __table_args__ = (
        CheckConstraint(
            "image_type IN ('before', 'after', 'process', 'hero')",
            name="chk_service_images_type",
        ),
    )


class AirconBrand(Base):
    __tablename__ = "aircon_brands"

    id: Mapped[int] = pk_column()
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(Text)
    is_partner: Mapped[bool] = mapped_column(Boolean, default=False)
    badge_text: Mapped[str | None] = mapped_column(String(50))
    badge_color: Mapped[str | None] = mapped_column(String(20))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()
    deleted_at: Mapped[datetime | None] = deleted_at_column()

    images: Mapped[list["BrandImage"]] = relationship(
        back_populates="brand", lazy="selectin",
        order_by="BrandImage.display_order",
    )


class BrandImage(Base):
    __tablename__ = "brand_images"

    id: Mapped[int] = pk_column()
    brand_id: Mapped[int] = mapped_column(ForeignKey("aircon_brands.id", ondelete="CASCADE"))
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    image_type: Mapped[str | None] = mapped_column(String(20))
    caption: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = created_at_column()

    brand: Mapped["AirconBrand"] = relationship(back_populates="images")

    __table_args__ = (
        CheckConstraint(
            "image_type IN ('logo', 'product', 'banner')", name="chk_brand_images_type"
        ),
    )
