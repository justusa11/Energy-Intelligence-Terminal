from datetime import datetime

from sqlalchemy.orm import Session

from app.models.market_price import MarketPrice

from sqlalchemy.exc import IntegrityError


def create_market_price(
    db: Session,
    *,
    country_code: str,
    market: str,
    zone: str,
    source: str,
    timestamp_utc: datetime,
    price: float,
    currency: str = "EUR",
    unit: str = "MWh",
    local_timestamp: datetime | None = None,
) -> MarketPrice:
    record = MarketPrice(
        country_code=country_code,
        market=market,
        zone=zone,
        source=source,
        timestamp_utc=timestamp_utc,
        local_timestamp=local_timestamp,
        price=price,
        currency=currency,
        unit=unit,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


def get_market_prices(
    db: Session,
    *,
    country_code: str,
    zone: str,
    market: str = "day_ahead",
    limit: int = 24,
) -> list[MarketPrice]:
    return (
        db.query(MarketPrice)
        .filter(MarketPrice.country_code == country_code)
        .filter(MarketPrice.zone == zone)
        .filter(MarketPrice.market == market)
        .order_by(MarketPrice.timestamp_utc.desc())
        .limit(limit)
        .all()
    )

def create_market_price_if_not_exists(
    db: Session,
    *,
    country_code: str,
    market: str,
    zone: str,
    source: str,
    timestamp_utc: datetime,
    price: float,
    currency: str = "EUR",
    unit: str = "MWh",
    local_timestamp: datetime | None = None,
) -> tuple[MarketPrice | None, bool]:
    """
    Returns:
    - record or None
    - inserted flag
    """
    try:
        record = create_market_price(
            db,
            country_code=country_code,
            market=market,
            zone=zone,
            source=source,
            timestamp_utc=timestamp_utc,
            local_timestamp=local_timestamp,
            price=price,
            currency=currency,
            unit=unit,
        )
        return record, True
    except IntegrityError:
        db.rollback()
        return None, False