"""PSGC address reference tables (cached from PSGC API)."""

from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import created_at_column, pk_column, updated_at_column


class PsgcRegion(Base):
    __tablename__ = "psgc_regions"

    id: Mapped[int] = pk_column()
    region_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    region_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()


class PsgcProvince(Base):
    __tablename__ = "psgc_provinces"

    id: Mapped[int] = pk_column()
    province_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    province_name: Mapped[str] = mapped_column(String(100), nullable=False)
    region_code: Mapped[str] = mapped_column(
        ForeignKey("psgc_regions.region_code", ondelete="CASCADE"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()


class PsgcCityMunicipality(Base):
    __tablename__ = "psgc_cities_municipalities"

    id: Mapped[int] = pk_column()
    city_municipality_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    city_municipality_name: Mapped[str] = mapped_column(String(100), nullable=False)
    province_code: Mapped[str] = mapped_column(
        ForeignKey("psgc_provinces.province_code", ondelete="CASCADE"), nullable=False
    )
    is_city: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()


class PsgcBarangay(Base):
    __tablename__ = "psgc_barangays"

    id: Mapped[int] = pk_column()
    barangay_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    barangay_name: Mapped[str] = mapped_column(String(100), nullable=False)
    city_municipality_code: Mapped[str] = mapped_column(
        ForeignKey("psgc_cities_municipalities.city_municipality_code", ondelete="CASCADE"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()
