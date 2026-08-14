from app.data.market_event_seed import MARKET_EVENTS
from app.schemas.market_events import (
    MarketEvent,
    MarketEventAnalogue,
    MarketEventHistoryResponse,
    MarketEventWatchSignal,
    MarketEventWatchlistResponse,
    OperatorNoteGuidance,
    ShockAnalysisResponse,
)


SEVERITY_WEIGHT = {"watch": 1, "elevated": 2, "severe": 3}


def get_market_event_history(*, country: str, zone: str) -> MarketEventHistoryResponse:
    events = [_to_event(event) for event in MARKET_EVENTS if _matches_scope(event, country, zone)]
    return MarketEventHistoryResponse(country=country, zone=zone, events=events)


def build_shock_analysis(*, country: str, zone: str) -> ShockAnalysisResponse:
    scoped_events = [_to_event(event) for event in MARKET_EVENTS if _matches_scope(event, country, zone)]
    if not scoped_events:
        return ShockAnalysisResponse(
            country=country,
            zone=zone,
            shock_level="normal",
            primary_driver="No historical analogue is mapped for this zone yet.",
            risk_drivers=["No curated historical event coverage for the selected zone."],
            recommended_actions=[
                "Use standard price, weather, and data-quality monitoring.",
                "Add a curated market event before relying on historical analogue analysis.",
            ],
            analogues=[],
        )

    analogues = sorted(
        [_score_event(event, country=country, zone=zone) for event in scoped_events],
        key=lambda item: item.similarity_score,
        reverse=True,
    )
    leading = analogues[0]
    shock_level = _shock_level(leading.event.severity, leading.similarity_score)
    risk_drivers = _risk_drivers(analogues)
    actions = _recommended_actions(analogues)

    return ShockAnalysisResponse(
        country=country,
        zone=zone,
        shock_level=shock_level,
        primary_driver=f"{leading.event.name}: {leading.event.market_impact[0]}",
        risk_drivers=risk_drivers,
        recommended_actions=actions,
        analogues=analogues[:3],
    )


def build_watchlist(*, country: str, zone: str) -> MarketEventWatchlistResponse:
    scoped_events = [_to_event(event) for event in MARKET_EVENTS if _matches_scope(event, country, zone)]
    signal_map: dict[str, MarketEventWatchSignal] = {}
    for event in scoped_events:
        for signal in event.watch_signals:
            existing = signal_map.get(signal)
            scenario_ids = [
                scenario.id
                for scenario in event.scenario_templates
                if scenario.id == signal or signal in scenario.id
            ]
            if existing:
                existing.related_event_ids.append(event.id)
                existing.scenario_template_ids = sorted(
                    set(existing.scenario_template_ids + scenario_ids)
                )
                continue
            signal_map[signal] = MarketEventWatchSignal(
                id=signal,
                label=_signal_label(signal),
                severity=_signal_severity(event.severity),
                description=_signal_description(signal, event.name),
                related_event_ids=[event.id],
                scenario_template_ids=scenario_ids,
            )

    signals = sorted(
        signal_map.values(),
        key=lambda item: (SEVERITY_WEIGHT.get(item.severity, 0), len(item.related_event_ids)),
        reverse=True,
    )
    return MarketEventWatchlistResponse(
        country=country,
        zone=zone,
        signals=signals,
        operator_note_guidance=OperatorNoteGuidance(
            storage="local_browser",
            max_length=600,
            fields=["event_id", "note", "created_at_utc"],
        ),
    )


def _matches_scope(event: dict, country: str, zone: str) -> bool:
    return country in event["affected_countries"] or zone in event["affected_zones"]


def _to_event(event: dict) -> MarketEvent:
    return MarketEvent(**event)


def _score_event(event: MarketEvent, *, country: str, zone: str) -> MarketEventAnalogue:
    matched_signals: list[str] = []
    score = 0.0
    if country in event.affected_countries:
        score += 0.35
        matched_signals.append(f"country:{country}")
    if zone in event.affected_zones:
        score += 0.45
        matched_signals.append(f"zone:{zone}")
    score += min(0.2, 0.05 * len(event.commodities))
    score += min(0.1, SEVERITY_WEIGHT.get(event.severity, 1) * 0.03)
    return MarketEventAnalogue(
        event=event,
        similarity_score=round(min(score, 0.99), 2),
        matched_signals=matched_signals or ["regional analogue"],
    )


def _shock_level(severity: str, score: float) -> str:
    if severity == "severe" and score >= 0.8:
        return "severe"
    if severity in {"severe", "elevated"} and score >= 0.55:
        return "elevated"
    if score >= 0.35:
        return "watch"
    return "normal"


def _risk_drivers(analogues: list[MarketEventAnalogue]) -> list[str]:
    drivers: list[str] = []
    for analogue in analogues:
        for signal in analogue.event.watch_signals:
            if signal not in drivers:
                drivers.append(signal)
            if len(drivers) == 5:
                return drivers
    return drivers


def _recommended_actions(analogues: list[MarketEventAnalogue]) -> list[str]:
    actions: list[str] = []
    for analogue in analogues:
        for action in analogue.event.playbook:
            if action not in actions:
                actions.append(action)
            if len(actions) == 4:
                return actions
    return actions


def _signal_label(signal: str) -> str:
    return signal.replace("_", " ").title()


def _signal_severity(event_severity: str) -> str:
    return event_severity if event_severity in SEVERITY_WEIGHT else "watch"


def _signal_description(signal: str, event_name: str) -> str:
    return f"Monitor {signal.replace('_', ' ')} because it appeared in {event_name}."
