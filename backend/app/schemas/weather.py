from pydantic import BaseModel

class WeatherForecastResponse(BaseModel):
    country: str
    zone: str
    temperature_c: float
    wind_speed_ms: float
    solar_radiation_wm2: float
    summary: str

