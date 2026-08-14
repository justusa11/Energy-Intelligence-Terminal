"""Shared price-series loading with a deterministic sample fallback.

Every analytical module (forecast, screener, flexibility, simulator,
reports) works from the same hourly series. If the database has no rows
for the requested zone, a deterministic synthetic series is generated so
the product stays fully functional in demos and for sample-mode zones.
"""

import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.countries import get_zone
from app.repositories.price_repository import get_market_prices


@dataclass
class PricePoint:
    timestamp_utc: datetime
    price: float


@dataclass
class PriceSeries:
    country: str
    zone: str
    source: str  # "database" | "sample"
    points: list[PricePoint]

    @property
    def prices(self) -> list[float]:
        return [p.price for p in self.points]


def load_price_series(
    db: Session,
    *,
    country: str = "DK",
    zone: str = "DK1",
    hours: int = 24,
    allow_sample_fallback: bool = True,
) -> PriceSeries:
    try:
        records = get_market_prices(
            db,
            country_code=country,
            zone=zone,
            market="day_ahead",
            limit=hours * 4,
        )
    except SQLAlchemyError:
        db.rollback()
        records = []

    if records:
        raw_points = [
            PricePoint(timestamp_utc=r.timestamp_utc, price=r.price)
            for r in reversed(records)
        ]
        points = _aggregate_to_hourly(raw_points)[-hours:]
        return PriceSeries(country=country, zone=zone, source="database", points=points)

    if not allow_sample_fallback:
        return PriceSeries(country=country, zone=zone, source="database", points=[])

    return generate_sample_series(country=country, zone=zone, hours=hours)


def _aggregate_to_hourly(points: list[PricePoint]) -> list[PricePoint]:
    buckets: dict[datetime, list[float]] = {}

    for point in points:
        timestamp = point.timestamp_utc
        bucket = timestamp.replace(minute=0, second=0, microsecond=0)
        buckets.setdefault(bucket, []).append(point.price)

    return [
        PricePoint(
            timestamp_utc=bucket,
            price=round(sum(prices) / len(prices), 2),
        )
        for bucket, prices in sorted(buckets.items())
    ]


def generate_sample_series(
    *,
    country: str,
    zone: str,
    hours: int = 24,
    end_time: datetime | None = None,
) -> PriceSeries:
    """Deterministic synthetic day-ahead curve with morning/evening peaks.

    Deterministic (seeded by zone + hour) so charts, tests, and reports
    are reproducible run-to-run.
    """
    zone_cfg = get_zone(country, zone)
    base = zone_cfg.base_price if zone_cfg else 70.0
    volatility = zone_cfg.volatility if zone_cfg else 1.0

    if end_time is None:
        now = datetime.now(timezone.utc)
        end_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=24)

    start_time = end_time - timedelta(hours=hours)
    zone_seed = sum(ord(c) for c in f"{country}{zone}")

    points: list[PricePoint] = []
    for i in range(hours):
        ts = start_time + timedelta(hours=i)
        hour = ts.hour
        day = ts.timetuple().tm_yday

        # Two daily peaks (08h and 18h) over a nightly trough.
        daily_shape = (
            0.55 * math.exp(-((hour - 8) ** 2) / 8.0)
            + 0.85 * math.exp(-((hour - 18) ** 2) / 6.0)
            - 0.35 * math.exp(-((hour - 3) ** 2) / 10.0)
        )
        weekly = -0.12 if ts.weekday() >= 5 else 0.0

        # Daily-periodic component (repeats each day → learnable via lag-24)
        # plus a small day-varying residual (genuinely unpredictable), so a
        # baseline model reaches a realistic single/low-double-digit MAE.
        shape_noise = 0.10 * math.sin(zone_seed + hour * 1.3)
        residual = 0.05 * math.sin(day * 2.7) + 0.03 * math.sin(day * 1.3 + hour * 0.7)

        price = base * (1.0 + volatility * (daily_shape + weekly + shape_noise + residual))
        points.append(PricePoint(timestamp_utc=ts, price=round(price, 2)))

    return PriceSeries(country=country, zone=zone, source="sample", points=points)
