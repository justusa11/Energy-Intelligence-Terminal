from datetime import datetime

from sqlalchemy import DateTime, Float, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MarketPrice(Base):
    __tablename__ = "market_prices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    country_code: Mapped[str] = mapped_column(String(10), index=True)
    market: Mapped[str] = mapped_column(String(50), index=True)
    zone: Mapped[str] = mapped_column(String(50), index=True)
    source: Mapped[str] = mapped_column(String(100), index=True)

    timestamp_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    local_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)

    price: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="EUR")
    unit: Mapped[str] = mapped_column(String(20), default="MWh")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    __table_args__ = (
        UniqueConstraint(
            "country_code",
            "market",
            "zone",
            "source",
            "timestamp_utc",
            name="uq_market_price_unique_timestamp",
        ),
    )