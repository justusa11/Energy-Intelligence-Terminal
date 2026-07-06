from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.countries import CountriesResponse
from app.schemas.market import MarketOverviewResponse
from app.services.market_service import get_countries, get_market_overview

router = APIRouter()


@router.get("/overview", response_model=MarketOverviewResponse)
def market_overview(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    return get_market_overview(db, country=country, zone=zone)


@router.get("/countries", response_model=CountriesResponse)
def countries():
    return get_countries()
