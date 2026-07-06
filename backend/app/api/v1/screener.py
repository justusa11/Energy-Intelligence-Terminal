from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.screener import ScreenerResponse
from app.services.screener_service import get_screener_opportunities

router = APIRouter()


@router.get("/opportunities", response_model=ScreenerResponse)
def screener_opportunities(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    return get_screener_opportunities(db, country=country, zone=zone)
