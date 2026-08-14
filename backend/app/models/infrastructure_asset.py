from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InfrastructureAsset(Base):
    __tablename__ = "infrastructure_assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    asset_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    asset_type: Mapped[str] = mapped_column(String(50), index=True)
    region: Mapped[str] = mapped_column(String(50), default="europe", index=True)
    country_code: Mapped[str] = mapped_column(String(10), index=True)
    zone: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    capacity_mw: Mapped[float | None] = mapped_column(Float, nullable=True)
    fuel_type: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    technology: Mapped[str | None] = mapped_column(String(120), nullable=True)
    operator: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(120), index=True)
    source_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class InfrastructureLink(Base):
    __tablename__ = "infrastructure_links"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    link_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    link_type: Mapped[str] = mapped_column(String(80), default="interconnector", index=True)
    region: Mapped[str] = mapped_column(String(50), default="europe", index=True)
    from_asset_id: Mapped[str] = mapped_column(String(120), index=True)
    to_asset_id: Mapped[str] = mapped_column(String(120), index=True)
    capacity_mw: Mapped[float | None] = mapped_column(Float, nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(120), default="curated_seed", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("from_asset_id", "to_asset_id", "link_type", name="uq_infrastructure_link_pair"),
    )
