import math
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.repositories.weather_repository import get_latest_weather_forecasts
from app.schemas.weather import WeatherForecastPoint, WeatherForecastResponse

ZONE_WEATHER_BASELINES = {
    "DK1": {"temp": 11.5, "wind": 8.2, "solar": 155.0, "rain": 0.18},
    "DK2": {"temp": 12.0, "wind": 7.6, "solar": 160.0, "rain": 0.16},
    "DE-LU": {"temp": 13.8, "wind": 6.1, "solar": 175.0, "rain": 0.12},
    "ERCOT": {"temp": 29.0, "wind": 5.8, "solar": 285.0, "rain": 0.04},
    "JP-TK": {"temp": 24.5, "wind": 4.7, "solar": 210.0, "rain": 0.22},
}


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

    if records:
        records = list(reversed(records))
        forecasts = [
            WeatherForecastPoint(
                target_time_utc=record.target_time_utc,
                temperature_2m_c=record.temperature_2m_c,
                wind_speed_10m_ms=record.wind_speed_10m_ms,
                wind_speed_100m_ms=record.wind_speed_100m_ms,
                shortwave_radiation_wm2=record.shortwave_radiation_wm2,
                precipitation_mm=record.precipitation_mm,
            )
            for record in records
        ]
        source = "open_meteo"
    else:
        forecasts = generate_sample_weather(country=country, zone=zone)
        source = "sample"

    return WeatherForecastResponse(
        country=country,
        zone=zone,
        source=source,
        forecasts=forecasts,
    )


def generate_sample_weather(*, country: str, zone: str, hours: int = 24) -> list[WeatherForecastPoint]:
    baseline = ZONE_WEATHER_BASELINES.get(
        zone,
        {"temp": 14.0, "wind": 6.5, "solar": 170.0, "rain": 0.1},
    )
    seed = sum(ord(char) for char in f"{country}{zone}")
    start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)

    points: list[WeatherForecastPoint] = []
    for index in range(hours):
        target = start + timedelta(hours=index)
        hour = target.hour
        daylight = max(0.0, math.sin((hour - 6) / 12 * math.pi))
        temp = baseline["temp"] + 4.5 * math.sin((hour - 7) / 24 * 2 * math.pi)
        wind = baseline["wind"] + 1.8 * math.sin(seed + index * 0.7)
        rain_wave = max(0.0, math.sin(seed * 0.3 + index * 0.55))

        points.append(
            WeatherForecastPoint(
                target_time_utc=target,
                temperature_2m_c=round(temp, 1),
                wind_speed_10m_ms=round(max(0.5, wind * 0.72), 1),
                wind_speed_100m_ms=round(max(1.0, wind), 1),
                shortwave_radiation_wm2=round(baseline["solar"] * daylight, 1),
                precipitation_mm=round(baseline["rain"] * rain_wave, 2),
            )
        )

    return points
