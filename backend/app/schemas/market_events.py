from pydantic import BaseModel


class MarketImpactMetrics(BaseModel):
    peak_price_change_pct: float
    volatility_change_pct: float
    spread_change_eur_mwh: float
    duration_days: int
    recovery_days: int


class EventTimelinePhase(BaseModel):
    phase: str
    date: str
    description: str


class ScenarioTemplate(BaseModel):
    id: str
    label: str
    description: str
    severity: str


class ConfidenceLabel(BaseModel):
    claim: str
    confidence: str
    basis: str


class MarketEvent(BaseModel):
    id: str
    name: str
    event_type: str
    start_date: str
    end_date: str
    severity: str
    affected_countries: list[str]
    affected_zones: list[str]
    commodities: list[str]
    market_impact: list[str]
    playbook: list[str]
    watch_signals: list[str]
    impact_metrics: MarketImpactMetrics
    linked_asset_ids: list[str]
    timeline: list[EventTimelinePhase]
    scenario_templates: list[ScenarioTemplate]
    confidence_labels: list[ConfidenceLabel]


class MarketEventHistoryResponse(BaseModel):
    country: str
    zone: str
    events: list[MarketEvent]


class MarketEventAnalogue(BaseModel):
    event: MarketEvent
    similarity_score: float
    matched_signals: list[str]


class ShockAnalysisResponse(BaseModel):
    country: str
    zone: str
    shock_level: str
    primary_driver: str
    risk_drivers: list[str]
    recommended_actions: list[str]
    analogues: list[MarketEventAnalogue]


class MarketEventWatchSignal(BaseModel):
    id: str
    label: str
    severity: str
    description: str
    related_event_ids: list[str]
    scenario_template_ids: list[str]


class OperatorNoteGuidance(BaseModel):
    storage: str
    max_length: int
    fields: list[str]


class MarketEventWatchlistResponse(BaseModel):
    country: str
    zone: str
    signals: list[MarketEventWatchSignal]
    operator_note_guidance: OperatorNoteGuidance
