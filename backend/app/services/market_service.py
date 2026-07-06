"""Market overview computed from stored prices (sample fallback when empty)."""

from sqlalchemy.orm import Session

from app.core.countries import COUNTRIES
from app.schemas.countries import CountriesResponse, CountryInfo, ZoneInfo
from app.schemas.market import MarketOverviewResponse
from app.services.forecast_service import classify_regime
from app.services.price_data import load_price_series
from app.services.risk_service import get_risk_status


def get_market_overview(
    db: Session | None = None,
    *,
    country: str = "DK",
    zone: str = "DK1",
) -> MarketOverviewResponse:
    if db is None:
        return _static_overview(country, zone)

    series = load_price_series(db, country=country, zone=zone, hours=24)
    prices = series.prices
    if not prices:
        return _static_overview(country, zone)

    average = sum(prices) / len(prices)
    peak = max(prices)
    cheapest_point = min(series.points, key=lambda p: p.price)
    cheapest_hour = (
        f"{cheapest_point.timestamp_utc:%H:%M}-"
        f"{(cheapest_point.timestamp_utc.hour + 1) % 24:02d}:00"
    )

    regime = classify_regime(prices)
    risk = get_risk_status(db, country=country, zone=zone)
    recommendation = _build_recommendation(series, regime.name, risk.status)

    return MarketOverviewResponse(
        country=country,
        zone=zone,
        average_price_eur_mwh=round(average, 2),
        peak_price_eur_mwh=round(peak, 2),
        cheapest_hour=cheapest_hour,
        market_regime=regime.name.capitalize(),
        regime_confidence=regime.confidence,
        risk_status=risk.status,
        recommendation=recommendation,
    )


def get_countries() -> CountriesResponse:
    return CountriesResponse(
        countries=[
            CountryInfo(
                code=c.code,
                name=c.name,
                timezone=c.timezone,
                zones=[
                    ZoneInfo(
                        code=z.code,
                        name=z.name,
                        data_mode=z.data_mode,
                        currency=z.currency,
                    )
                    for z in c.zones
                ],
            )
            for c in COUNTRIES.values()
        ]
    )


def _build_recommendation(series, regime_name: str, risk_status: str) -> str:
    cheapest = min(series.points, key=lambda p: p.price)
    dearest = max(series.points, key=lambda p: p.price)

    if risk_status == "CRITICAL":
        return (
            "Automated recommendations are blocked: critical data-quality issues. "
            "See the Risk Monitor before acting."
        )

    action = (
        f"Shift flexible consumption to around {cheapest.timestamp_utc:%H:%M} "
        f"({cheapest.price:.0f} EUR/MWh) and reduce load around "
        f"{dearest.timestamp_utc:%H:%M} ({dearest.price:.0f} EUR/MWh)."
    )

    if regime_name == "volatile":
        action += " Volatile regime: prefer smaller, staged adjustments."
    elif regime_name == "surplus":
        action += " Surplus regime: maximize storage charging while prices are depressed."
    elif regime_name == "scarcity":
        action += " Scarcity regime: discharge storage into the evening peak if available."

    if risk_status == "WARN":
        action += " (Data-quality warnings active — verify before automating.)"

    return action


def _static_overview(country: str, zone: str) -> MarketOverviewResponse:
    return MarketOverviewResponse(
        country=country,
        zone=zone,
        average_price_eur_mwh=82.4,
        peak_price_eur_mwh=176.2,
        cheapest_hour="03:00-04:00",
        market_regime="Normal",
        regime_confidence=0.75,
        risk_status="SAFE",
        recommendation="Reduce flexible load between 17:00 and 20:00.",
    )
