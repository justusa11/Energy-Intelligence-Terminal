from sqlalchemy.orm import Session

from app.models.energy_market_mark import EnergyMarketMark


def get_market_marks(
    db: Session,
    *,
    country_code: str,
    zone: str,
    instrument: str,
    limit: int = 7,
) -> list[EnergyMarketMark]:
    return (
        db.query(EnergyMarketMark)
        .filter(EnergyMarketMark.country_code == country_code)
        .filter(EnergyMarketMark.zone == zone)
        .filter(EnergyMarketMark.instrument == instrument)
        .order_by(EnergyMarketMark.timestamp_utc.desc())
        .limit(limit)
        .all()
    )

