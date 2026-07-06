"""Market screener: cheap/expensive hours, spike and negative-price risk."""

from sqlalchemy.orm import Session

from app.schemas.screener import ScreenerHour, ScreenerOpportunity, ScreenerResponse
from app.services.price_data import load_price_series

TOP_N = 4


def get_screener_opportunities(
    db: Session,
    *,
    country: str = "DK",
    zone: str = "DK1",
) -> ScreenerResponse:
    series = load_price_series(db, country=country, zone=zone, hours=24)
    points = series.points

    if not points:
        return ScreenerResponse(
            country=country,
            zone=zone,
            data_source=series.source,
            cheapest_hours=[],
            most_expensive_hours=[],
            average_price_eur_mwh=0.0,
            price_spread_eur_mwh=0.0,
            spike_risk="low",
            negative_price_risk="low",
            opportunities=[],
        )

    ranked = sorted(points, key=lambda p: p.price)
    cheapest = ranked[:TOP_N]
    expensive = list(reversed(ranked[-TOP_N:]))

    prices = [p.price for p in points]
    average = sum(prices) / len(prices)
    spread = max(prices) - min(prices)
    negative_hours = sum(1 for p in prices if p < 0)
    spike_hours = sum(1 for p in prices if p > average * 1.8)

    spike_risk = "high" if spike_hours >= 3 else "medium" if spike_hours >= 1 else "low"
    negative_risk = (
        "high" if negative_hours >= 3 else "medium" if negative_hours >= 1 else "low"
    )

    opportunities: list[ScreenerOpportunity] = []

    opportunities.append(
        ScreenerOpportunity(
            kind="load_shift",
            title="Shift flexible load to the cheapest window",
            detail=(
                f"Cheapest hour {cheapest[0].timestamp_utc:%H:%M} at "
                f"{cheapest[0].price:.1f} EUR/MWh vs peak "
                f"{expensive[0].price:.1f} EUR/MWh — spread {spread:.1f} EUR/MWh."
            ),
            severity="opportunity" if spread > 40 else "info",
        )
    )

    if spike_risk != "low":
        opportunities.append(
            ScreenerOpportunity(
                kind="spike_risk",
                title="Price spike risk detected",
                detail=f"{spike_hours} hours priced above 180% of the daily average. "
                "Avoid discretionary consumption in peak hours.",
                severity="warning",
            )
        )

    if negative_risk != "low":
        opportunities.append(
            ScreenerOpportunity(
                kind="negative_prices",
                title="Negative price hours available",
                detail=f"{negative_hours} hours with negative prices — charging storage "
                "or pre-heating during these hours is effectively paid consumption.",
                severity="opportunity",
            )
        )

    if spread > 80:
        opportunities.append(
            ScreenerOpportunity(
                kind="arbitrage",
                title="Battery arbitrage window",
                detail=f"Intraday spread of {spread:.0f} EUR/MWh supports a "
                "charge-low / discharge-high cycle (see Simulator).",
                severity="opportunity",
            )
        )

    return ScreenerResponse(
        country=country,
        zone=zone,
        data_source=series.source,
        cheapest_hours=[_hour(p) for p in cheapest],
        most_expensive_hours=[_hour(p) for p in expensive],
        average_price_eur_mwh=round(average, 2),
        price_spread_eur_mwh=round(spread, 2),
        spike_risk=spike_risk,
        negative_price_risk=negative_risk,
        opportunities=opportunities,
    )


def _hour(point) -> ScreenerHour:
    return ScreenerHour(
        hour=point.timestamp_utc.strftime("%H:%M"),
        price_eur_mwh=round(point.price, 2),
    )
