from fastapi import APIRouter, Query

from app.schemas.market_events import (
    MarketEventHistoryResponse,
    MarketEventWatchlistResponse,
    ShockAnalysisResponse,
)
from app.services.market_event_service import (
    build_shock_analysis,
    build_watchlist,
    get_market_event_history,
)

router = APIRouter()


@router.get("/history", response_model=MarketEventHistoryResponse)
def market_event_history(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
):
    return get_market_event_history(country=country, zone=zone)


@router.get("/shock-analysis", response_model=ShockAnalysisResponse)
def market_shock_analysis(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
):
    return build_shock_analysis(country=country, zone=zone)


@router.get("/watchlist", response_model=MarketEventWatchlistResponse)
def market_event_watchlist(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
):
    return build_watchlist(country=country, zone=zone)
