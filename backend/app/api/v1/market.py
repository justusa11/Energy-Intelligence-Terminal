from fastapi import APIRouter, Query

from app.schemas.market import MarketOverviewResponse
from app.services.market_service import get_market_overview

router = APIRouter()


@router.get("/overview", response_model=MarketOverviewResponse)
def market_overview(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
):
    return get_market_overview(country=country, zone=zone)