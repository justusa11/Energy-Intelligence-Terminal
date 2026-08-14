from datetime import datetime

from sqlalchemy import DateTime, Float, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EnergyMarketMark(Base):
    __tablename__ = "energy_market_marks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    country_code: Mapped[str] = mapped_column(String(10), index=True)
    zone: Mapped[str] = mapped_column(String(50), index=True)
    instrument: Mapped[str] = mapped_column(String(80), index=True)
    unit: Mapped[str] = mapped_column(String(30))
    source: Mapped[str] = mapped_column(String(120), index=True)
    timestamp_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    value: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "country_code",
            "zone",
            "instrument",
            "source",
            "timestamp_utc",
            name="uq_energy_market_mark_unique_timestamp",
        ),
    )
