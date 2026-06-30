from pydantic import BaseModel


class MarketOverviewResponse(BaseModel):
    country: str
    zone: str
    average_price_eur_mwh: float
    peak_price_eur_mwh: float
    cheapest_hour: str
    market_regime: str
    regime_confidence: float
    risk_status: str
    recommendation: str