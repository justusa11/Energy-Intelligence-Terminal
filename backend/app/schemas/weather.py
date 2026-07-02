from datetime import datetime

from pydantic import BaseModel


class WeatherForecastPoint(BaseModel):
    target_time_utc: datetime
    temperature_2m_c: float | None
    wind_speed_10m_ms: float | None
    wind_speed_100m_ms: float | None
    shortwave_radiation_wm2: float | None
    precipitation_mm: float | None


class WeatherForecastResponse(BaseModel):
    country: str
    zone: str
    source: str
    forecasts: list[WeatherForecastPoint]