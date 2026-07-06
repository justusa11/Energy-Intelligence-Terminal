from pydantic import BaseModel


class ScreenerHour(BaseModel):
    hour: str
    price_eur_mwh: float


class ScreenerOpportunity(BaseModel):
    kind: str
    title: str
    detail: str
    severity: str  # info | opportunity | warning


class ScreenerResponse(BaseModel):
    country: str
    zone: str
    data_source: str
    cheapest_hours: list[ScreenerHour]
    most_expensive_hours: list[ScreenerHour]
    average_price_eur_mwh: float
    price_spread_eur_mwh: float
    spike_risk: str  # low | medium | high
    negative_price_risk: str  # low | medium | high
    opportunities: list[ScreenerOpportunity]
