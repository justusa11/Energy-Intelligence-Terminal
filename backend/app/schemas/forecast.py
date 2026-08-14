from datetime import datetime

from pydantic import BaseModel


class ForecastMetrics(BaseModel):
    mae: float
    rmse: float
    sample_hours: int


class MarketRegime(BaseModel):
    name: str
    confidence: float
    drivers: list[str]


class ForecastPoint(BaseModel):
    target_time_utc: datetime
    predicted_price_eur_mwh: float


class ForecastResponse(BaseModel):
    country: str
    zone: str
    model: str
    data_source: str
    confidence: float
    drivers: list[str]
    feature_summary: dict[str, str | int | float]
    generated_at_utc: datetime
    metrics: ForecastMetrics
    regime: MarketRegime
    points: list[ForecastPoint]
