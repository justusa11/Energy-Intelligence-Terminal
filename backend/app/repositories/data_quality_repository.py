from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.market_price import MarketPrice
from app.models.weather import WeatherForecast


def count_market_prices(
    db: Session,
    *,
    country_code: str,
    zone: str,
    market: str = "day_ahead",
) -> int:
    return (
        db.query(MarketPrice)
        .filter(MarketPrice.country_code == country_code)
        .filter(MarketPrice.zone == zone)
        .filter(MarketPrice.market == market)
        .count()
    )


def count_null_market_prices(
    db: Session,
    *,
    country_code: str,
    zone: str,
    market: str = "day_ahead",
) -> int:
    return (
        db.query(MarketPrice)
        .filter(MarketPrice.country_code == country_code)
        .filter(MarketPrice.zone == zone)
        .filter(MarketPrice.market == market)
        .filter(MarketPrice.price.is_(None))
        .count()
    )


def count_duplicate_market_price_timestamps(
    db: Session,
    *,
    country_code: str,
    zone: str,
    market: str = "day_ahead",
) -> int:
    duplicate_rows = (
        db.query(
            MarketPrice.timestamp_utc,
            func.count(MarketPrice.id).label("count"),
        )
        .filter(MarketPrice.country_code == country_code)
        .filter(MarketPrice.zone == zone)
        .filter(MarketPrice.market == market)
        .group_by(MarketPrice.timestamp_utc)
        .having(func.count(MarketPrice.id) > 1)
        .all()
    )

    return len(duplicate_rows)


def get_latest_market_price_timestamp(
    db: Session,
    *,
    country_code: str,
    zone: str,
    market: str = "day_ahead",
) -> datetime | None:
    return (
        db.query(func.max(MarketPrice.timestamp_utc))
        .filter(MarketPrice.country_code == country_code)
        .filter(MarketPrice.zone == zone)
        .filter(MarketPrice.market == market)
        .scalar()
    )


def count_weather_forecasts(
    db: Session,
    *,
    country_code: str,
    zone: str,
) -> int:
    return (
        db.query(WeatherForecast)
        .filter(WeatherForecast.country_code == country_code)
        .filter(WeatherForecast.zone == zone)
        .count()
    )


def count_null_weather_values(
    db: Session,
    *,
    country_code: str,
    zone: str,
) -> int:
    return (
        db.query(WeatherForecast)
        .filter(WeatherForecast.country_code == country_code)
        .filter(WeatherForecast.zone == zone)
        .filter(
            (WeatherForecast.temperature_2m_c.is_(None))
            | (WeatherForecast.wind_speed_10m_ms.is_(None))
            | (WeatherForecast.shortwave_radiation_wm2.is_(None))
        )
        .count()
    )


def count_duplicate_weather_timestamps(
    db: Session,
    *,
    country_code: str,
    zone: str,
) -> int:
    duplicate_rows = (
        db.query(
            WeatherForecast.target_time_utc,
            func.count(WeatherForecast.id).label("count"),
        )
        .filter(WeatherForecast.country_code == country_code)
        .filter(WeatherForecast.zone == zone)
        .group_by(WeatherForecast.target_time_utc)
        .having(func.count(WeatherForecast.id) > 1)
        .all()
    )

    return len(duplicate_rows)


def get_latest_weather_target_timestamp(
    db: Session,
    *,
    country_code: str,
    zone: str,
) -> datetime | None:
    return (
        db.query(func.max(WeatherForecast.target_time_utc))
        .filter(WeatherForecast.country_code == country_code)
        .filter(WeatherForecast.zone == zone)
        .scalar()
    )


def hours_since(timestamp: datetime | None) -> float | None:
    if timestamp is None:
        return None

    now = datetime.now(timezone.utc)

    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    delta = now - timestamp
    return delta.total_seconds() / 3600