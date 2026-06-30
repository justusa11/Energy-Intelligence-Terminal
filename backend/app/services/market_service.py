from app.schemas.market import MarketOverviewResponse


def get_market_overview(country: str = "DK", zone: str = "DK1") -> MarketOverviewResponse:
    return MarketOverviewResponse(
        country=country,
        zone=zone,
        average_price_eur_mwh=82.4,
        peak_price_eur_mwh=176.2,
        cheapest_hour="03:00-04:00",
        market_regime="Scarcity",
        regime_confidence=0.78,
        risk_status="SAFE",
        recommendation="Reduce flexible load between 17:00 and 20:00.",
    )