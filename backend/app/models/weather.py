from datetime import datetime

from sqlalchemy import DateTime, Float, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    country_code: Mapped[str] = mapped_column(String(10), index=True)
    zone: Mapped[str] = mapped_column(String(50), index=True)
    source: Mapped[str] = mapped_column(String(100), index=True)

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)

    forecast_issue_time_utc: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    target_time_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )

    temperature_2m_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_speed_10m_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_speed_100m_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    shortwave_radiation_wm2: Mapped[float | None] = mapped_column(Float, nullable=True)
    precipitation_mm: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    __table_args__ = (
        UniqueConstraint(
            "country_code",
            "zone",
            "source",
            "target_time_utc",
            name="uq_weather_forecast_unique_target_time",
        ),
    )