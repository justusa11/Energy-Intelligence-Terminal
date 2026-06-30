from fastapi import APIRouter, Query

from app.schemas.prices import DayAheadPricesResponse
from app.services.price_service import get_day_ahead_prices

router = APIRouter()


@router.get("/day-ahead", response_model=DayAheadPricesResponse)
def day_ahead_prices(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
):
    return get_day_ahead_prices(country=country, zone=zone)