from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import timezone

from app.db.session import get_db
from app.schemas.prices import DayAheadPricesResponse, HourlyPrice
from app.services.price_data import load_price_series

router = APIRouter()


@router.get("/day-ahead", response_model=DayAheadPricesResponse)
def day_ahead_prices(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    series = load_price_series(
        db,
        country=country,
        zone=zone,
        hours=24,
        allow_sample_fallback=True,
    )

    return DayAheadPricesResponse(
        country=country,
        zone=zone,
        market="day_ahead",
        unit="EUR/MWh",
        data_source=series.source,
        prices=[
            HourlyPrice(
                hour=point.timestamp_utc.strftime("%H:%M"),
                timestamp_utc=_utc_isoformat(point.timestamp_utc),
                price_eur_mwh=point.price,
            )
            for point in series.points
        ],
    )


def _utc_isoformat(value):
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()
