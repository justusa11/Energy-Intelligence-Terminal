from pydantic import BaseModel


class MarketContextDriver(BaseModel):
    category: str
    label: str
    score: float
    level: str
    explanation: str
    evidence: list[str]


class MarketContextResponse(BaseModel):
    country: str
    zone: str
    context_level: str
    dominant_driver: str
    drivers: list[MarketContextDriver]
    recommended_actions: list[str]
    scenario_tags: list[str]
    confidence: float
    data_sources: dict[str, str]
