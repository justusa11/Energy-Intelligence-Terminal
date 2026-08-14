from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.market_context import MarketContextResponse
from app.services.market_context_service import build_market_context

router = APIRouter()


@router.get("/market-context", response_model=MarketContextResponse)
def market_context(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    return build_market_context(db, country=country, zone=zone)
