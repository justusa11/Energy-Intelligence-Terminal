"""AI Advisor: answers questions from live platform data.

Deterministic, rule-based composition over the same services that power
the dashboard — no external LLM required, so it is free to run and never
hallucinates numbers. The answer builder is intentionally isolated so an
LLM backend (OpenAI or a local model) can be swapped in behind
`answer_question` later without touching the API contract.
"""

from sqlalchemy.orm import Session

from app.schemas.advisor import AdvisorAnswer
from app.services.flexibility_service import get_flexibility_schedule
from app.services.forecast_service import get_price_forecast
from app.services.market_service import get_market_overview
from app.services.risk_service import get_risk_status
from app.services.screener_service import get_screener_opportunities

SUGGESTED_QUESTIONS = [
    "What is the market doing right now?",
    "When is electricity cheapest today?",
    "Should I charge my battery today?",
    "Is it safe to automate consumption right now?",
    "What does the price forecast look like?",
    "How much could I save with flexibility?",
]


def answer_question(
    db: Session,
    *,
    question: str,
    country: str = "DK",
    zone: str = "DK1",
) -> AdvisorAnswer:
    q = question.lower()
    sources: list[str] = []
    parts: list[str] = []

    wants_prices = any(w in q for w in ["cheap", "price", "hour", "cost", "expensive"])
    wants_forecast = any(w in q for w in ["forecast", "predict", "tomorrow", "next"])
    wants_risk = any(w in q for w in ["risk", "safe", "automate", "trust", "quality"])
    wants_battery = any(w in q for w in ["battery", "charge", "storage", "ev"])
    wants_savings = any(w in q for w in ["save", "saving", "flexib", "shift", "optimi"])
    wants_market = any(w in q for w in ["market", "regime", "overview", "doing", "situation"])

    if not any([wants_prices, wants_forecast, wants_risk, wants_battery, wants_savings, wants_market]):
        wants_market = wants_prices = True  # default briefing

    overview = get_market_overview(db, country=country, zone=zone)

    if wants_market:
        parts.append(
            f"{zone} is in a {overview.market_regime.lower()} regime "
            f"(confidence {overview.regime_confidence:.0%}). Average price is "
            f"{overview.average_price_eur_mwh:.0f} EUR/MWh with a peak of "
            f"{overview.peak_price_eur_mwh:.0f} EUR/MWh."
        )
        sources.append("market_overview")

    if wants_prices:
        screener = get_screener_opportunities(db, country=country, zone=zone)
        if screener.cheapest_hours:
            cheap = ", ".join(
                f"{h.hour} ({h.price_eur_mwh:.0f})" for h in screener.cheapest_hours[:3]
            )
            dear = ", ".join(
                f"{h.hour} ({h.price_eur_mwh:.0f})"
                for h in screener.most_expensive_hours[:3]
            )
            parts.append(
                f"Cheapest hours (EUR/MWh): {cheap}. Most expensive: {dear}. "
                f"Intraday spread is {screener.price_spread_eur_mwh:.0f} EUR/MWh."
            )
        sources.append("screener")

    if wants_forecast:
        forecast = get_price_forecast(db, country=country, zone=zone)
        if forecast.points:
            values = [p.predicted_price_eur_mwh for p in forecast.points]
            parts.append(
                f"The {forecast.model} forecast for the next {len(values)} hours ranges "
                f"{min(values):.0f}-{max(values):.0f} EUR/MWh "
                f"(backtest MAE {forecast.metrics.mae:.1f} EUR/MWh)."
            )
        sources.append("forecast")

    if wants_battery or wants_savings:
        flex = get_flexibility_schedule(db, country=country, zone=zone)
        parts.append(flex.summary)
        sources.append("flexibility_optimizer")

    if wants_risk or wants_battery:
        risk = get_risk_status(db, country=country, zone=zone)
        warn = [c.name for c in risk.checks if c.status != "OK"]
        if risk.status == "SAFE":
            parts.append("Risk gate is SAFE — recommendations can be acted on.")
        else:
            parts.append(
                f"Risk gate is {risk.status}: review {', '.join(warn)} before automating."
            )
        sources.append("risk_engine")

    answer = " ".join(parts) if parts else (
        "I could not derive an answer from the current platform data. "
        "Try one of the suggested questions."
    )

    return AdvisorAnswer(
        question=question,
        answer=answer,
        sources=sources,
        suggested_questions=SUGGESTED_QUESTIONS,
    )
