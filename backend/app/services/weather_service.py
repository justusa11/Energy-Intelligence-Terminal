from sqlalchemy.orm import Session

from app.repositories.weather_repository import get_latest_weather_forecasts
from app.schemas.weather import WeatherForecastPoint, WeatherForecastResponse


def get_weather_forecast(
    db: Session,
    *,
    country: str = "DK",
    zone: str = "DK1",
) -> WeatherForecastResponse:
    records = get_latest_weather_forecasts(
        db,
        country_code=country,
        zone=zone,
        source="open_meteo",
        limit=24,
    )

    records = list(reversed(records))

    return WeatherForecastResponse(
        country=country,
        zone=zone,
        source="open_meteo",
        forecasts=[
            WeatherForecastPoint(
                target_time_utc=record.target_time_utc,
                temperature_2m_c=record.temperature_2m_c,
                wind_speed_10m_ms=record.wind_speed_10m_ms,
                wind_speed_100m_ms=record.wind_speed_100m_ms,
                shortwave_radiation_wm2=record.shortwave_radiation_wm2,
                precipitation_mm=record.precipitation_mm,
            )
            for record in records
        ],
    )