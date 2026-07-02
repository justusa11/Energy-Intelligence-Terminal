from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.weather import WeatherForecast


def create_weather_forecast_if_not_exists(
    db: Session,
    *,
    country_code: str,
    zone: str,
    source: str,
    latitude: float,
    longitude: float,
    forecast_issue_time_utc: datetime | None,
    target_time_utc: datetime,
    temperature_2m_c: float | None,
    wind_speed_10m_ms: float | None,
    wind_speed_100m_ms: float | None,
    shortwave_radiation_wm2: float | None,
    precipitation_mm: float | None,
) -> tuple[WeatherForecast | None, bool]:
    record = WeatherForecast(
        country_code=country_code,
        zone=zone,
        source=source,
        latitude=latitude,
        longitude=longitude,
        forecast_issue_time_utc=forecast_issue_time_utc,
        target_time_utc=target_time_utc,
        temperature_2m_c=temperature_2m_c,
        wind_speed_10m_ms=wind_speed_10m_ms,
        wind_speed_100m_ms=wind_speed_100m_ms,
        shortwave_radiation_wm2=shortwave_radiation_wm2,
        precipitation_mm=precipitation_mm,
    )

    try:
        db.add(record)
        db.commit()
        db.refresh(record)
        return record, True
    except IntegrityError:
        db.rollback()
        return None, False


def get_latest_weather_forecasts(
    db: Session,
    *,
    country_code: str,
    zone: str,
    source: str = "open_meteo",
    limit: int = 24,
) -> list[WeatherForecast]:
    return (
        db.query(WeatherForecast)
        .filter(WeatherForecast.country_code == country_code)
        .filter(WeatherForecast.zone == zone)
        .filter(WeatherForecast.source == source)
        .order_by(WeatherForecast.target_time_utc.desc())
        .limit(limit)
        .all()
    )