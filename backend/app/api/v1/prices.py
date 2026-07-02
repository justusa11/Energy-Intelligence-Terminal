from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.price_repository import get_market_prices
from app.schemas.prices import DayAheadPricesResponse, HourlyPrice

router = APIRouter()


@router.get("/day-ahead", response_model=DayAheadPricesResponse)
def day_ahead_prices(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    records = get_market_prices(
        db,
        country_code=country,
        zone=zone,
        market="day_ahead",
        limit=24,
    )

    if not records:
        return DayAheadPricesResponse(
            country=country,
            zone=zone,
            market="day_ahead",
            unit="EUR/MWh",
            prices=[],
        )

    records = list(reversed(records))

    return DayAheadPricesResponse(
        country=country,
        zone=zone,
        market="day_ahead",
        unit="EUR/MWh",
        prices=[
            HourlyPrice(
                hour=record.timestamp_utc.strftime("%H:%M"),
                price_eur_mwh=record.price,
            )
            for record in records
        ],
    )
