from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.weather import WeatherForecastResponse
from app.services.weather_service import get_weather_forecast

router = APIRouter()


@router.get("/forecast", response_model=WeatherForecastResponse)
def weather_forecast(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    return get_weather_forecast(db, country=country, zone=zone)