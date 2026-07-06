from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.forecast import ForecastResponse
from app.services.forecast_service import get_price_forecast

router = APIRouter()


@router.get("/day-ahead", response_model=ForecastResponse)
def day_ahead_forecast(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    horizon_hours: int = Query(default=24, ge=1, le=72),
    db: Session = Depends(get_db),
):
    return get_price_forecast(db, country=country, zone=zone, horizon_hours=horizon_hours)
