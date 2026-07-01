from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.price_repository import create_market_price, get_market_prices
from app.schemas.prices import DayAheadPricesResponse, HourlyPrice
from app.services.price_service import get_day_ahead_prices

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
        return get_day_ahead_prices(country=country, zone=zone)

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


@router.post("/seed-sample")
def seed_sample_prices(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    sample_prices = [
        42.1, 38.5, 31.2, 24.8, 29.0, 45.4,
        72.0, 118.3, 134.1, 96.5, 76.2, 62.4,
        55.1, 49.8, 58.2, 83.0, 122.4, 158.4,
        176.2, 149.7, 101.3, 75.5, 58.0, 46.2,
    ]

    base_time = datetime(2026, 6, 4, 0, 0, tzinfo=timezone.utc)

    inserted = 0

    for hour, price in enumerate(sample_prices):
        try:
            create_market_price(
                db,
                country_code=country,
                market="day_ahead",
                zone=zone,
                source="sample",
                timestamp_utc=base_time + timedelta(hours=hour),
                price=price,
                currency="EUR",
                unit="MWh",
            )
            inserted += 1
        except IntegrityError:
            db.rollback()

    return {
        "status": "ok",
        "country": country,
        "zone": zone,
        "rows_inserted": inserted,
    }