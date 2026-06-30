from fastapi import APIRouter, Query

from app.schemas.weather import WeatherForecastResponse
from app.services.weather_service import get_weather_forecast

router = APIRouter()


@router.get("/forecast", response_model=WeatherForecastResponse)
def weather_forecast(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
):
    return get_weather_forecast(country=country, zone=zone)