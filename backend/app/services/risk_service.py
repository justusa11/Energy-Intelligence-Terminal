"""Risk engine: converts data health + forecast confidence into a gate.

Status contract (kept stable for the frontend and tests):
- overall: SAFE | WARN | CRITICAL
- checks:  OK | WARN | FAIL
Recommendations are only actionable when the gate is SAFE.
"""

from sqlalchemy.orm import Session

from app.repositories.data_quality_repository import (
    count_market_prices,
    get_latest_market_price_timestamp,
    get_latest_weather_target_timestamp,
    hours_since,
)
from app.schemas.risk import RiskCheck, RiskStatusResponse
from app.services.forecast_service import classify_regime
from app.services.price_data import load_price_series

PRICE_STALE_WARN_HOURS = 72
PRICE_STALE_FAIL_HOURS = 168
WEATHER_STALE_WARN_HOURS = 6


def get_risk_status(
    db: Session | None = None,
    *,
    country: str = "DK",
    zone: str = "DK1",
) -> RiskStatusResponse:
    if db is None:
        # Degraded mode without a DB session: static optimistic checks.
        return RiskStatusResponse(
            status="SAFE",
            checks=[
                RiskCheck(name="Price data freshness", status="OK", severity="low"),
                RiskCheck(name="Weather data freshness", status="OK", severity="low"),
                RiskCheck(name="Forecast confidence", status="OK", severity="low"),
                RiskCheck(name="Comfort constraints", status="OK", severity="low"),
            ],
        )

    checks: list[RiskCheck] = []

    # 1. Price data freshness.
    price_age = hours_since(
        get_latest_market_price_timestamp(db, country_code=country, zone=zone)
    )
    if price_age is None:
        checks.append(
            RiskCheck(name="Price data freshness", status="WARN", severity="medium")
        )
    elif price_age > PRICE_STALE_FAIL_HOURS:
        checks.append(
            RiskCheck(name="Price data freshness", status="FAIL", severity="high")
        )
    elif price_age > PRICE_STALE_WARN_HOURS:
        checks.append(
            RiskCheck(name="Price data freshness", status="WARN", severity="medium")
        )
    else:
        checks.append(
            RiskCheck(name="Price data freshness", status="OK", severity="low")
        )

    # 2. Weather data freshness.
    weather_age = hours_since(
        get_latest_weather_target_timestamp(db, country_code=country, zone=zone)
    )
    if weather_age is None or weather_age > WEATHER_STALE_WARN_HOURS:
        checks.append(
            RiskCheck(name="Weather data freshness", status="WARN", severity="medium")
        )
    else:
        checks.append(
            RiskCheck(name="Weather data freshness", status="OK", severity="low")
        )

    # 3. Price coverage.
    coverage = count_market_prices(db, country_code=country, zone=zone)
    if coverage >= 24:
        checks.append(RiskCheck(name="Price coverage", status="OK", severity="low"))
    elif coverage > 0:
        checks.append(RiskCheck(name="Price coverage", status="WARN", severity="medium"))
    else:
        checks.append(RiskCheck(name="Price coverage", status="WARN", severity="medium"))

    # 4. Forecast/regime confidence.
    series = load_price_series(db, country=country, zone=zone, hours=48)
    regime = classify_regime(series.prices)
    if regime.confidence >= 0.6:
        checks.append(
            RiskCheck(name="Forecast confidence", status="OK", severity="low")
        )
    else:
        checks.append(
            RiskCheck(name="Forecast confidence", status="WARN", severity="medium")
        )

    # 5. Comfort constraints: static OK until building/asset telemetry exists.
    checks.append(RiskCheck(name="Comfort constraints", status="OK", severity="low"))

    if any(c.status == "FAIL" for c in checks):
        overall = "CRITICAL"
    elif sum(1 for c in checks if c.status == "WARN") >= 2:
        overall = "WARN"
    else:
        overall = "SAFE"

    return RiskStatusResponse(status=overall, checks=checks)
