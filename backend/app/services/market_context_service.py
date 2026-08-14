from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.repositories.infrastructure_repository import get_infrastructure_assets
from app.schemas.market_context import MarketContextDriver, MarketContextResponse
from app.services.forecast_service import classify_regime
from app.services.market_event_service import build_shock_analysis
from app.services.price_data import load_price_series
from app.services.weather_service import get_weather_forecast


LEVEL_ORDER = {"normal": 0, "watch": 1, "elevated": 2, "severe": 3}


def build_market_context(db: Session, *, country: str, zone: str) -> MarketContextResponse:
    weather = get_weather_forecast(db, country=country, zone=zone)
    price_series = load_price_series(db, country=country, zone=zone, hours=48)
    shock = build_shock_analysis(country=country, zone=zone)
    assets = get_infrastructure_assets(
        db,
        region="global",
        asset_type="all",
        country=country,
        limit=500,
    )

    drivers = [
        _weather_driver(weather.forecasts),
        _seasonality_driver(zone),
        _event_driver(shock),
        _infrastructure_driver(assets),
        _price_driver(price_series.prices),
    ]
    dominant = max(drivers, key=lambda item: item.score)
    context_level = _combined_level(drivers)
    scenario_tags = _scenario_tags(drivers, shock.risk_drivers)

    return MarketContextResponse(
        country=country,
        zone=zone,
        context_level=context_level,
        dominant_driver=dominant.category,
        drivers=drivers,
        recommended_actions=_recommended_actions(context_level, dominant, scenario_tags),
        scenario_tags=scenario_tags,
        confidence=_confidence(drivers, weather.source, price_series.source),
        data_sources={
            "weather": weather.source,
            "prices": price_series.source,
            "events": "curated_market_event_ledger",
            "infrastructure": "curated_global_fleet",
        },
    )


def _weather_driver(points) -> MarketContextDriver:
    temperatures = [p.temperature_2m_c for p in points if p.temperature_2m_c is not None]
    winds = [p.wind_speed_100m_ms for p in points if p.wind_speed_100m_ms is not None]
    solar = [p.shortwave_radiation_wm2 for p in points if p.shortwave_radiation_wm2 is not None]
    avg_temp = sum(temperatures) / len(temperatures) if temperatures else 14.0
    avg_wind = sum(winds) / len(winds) if winds else 6.0
    max_solar = max(solar) if solar else 0.0

    score = 20.0
    evidence = [
        f"Average temperature {avg_temp:.1f} C.",
        f"Average 100m wind {avg_wind:.1f} m/s.",
        f"Peak solar radiation {max_solar:.0f} W/m2.",
    ]
    label = "Normal weather influence"
    if avg_temp <= 2:
        score += 45
        label = "Cold-demand stress"
        evidence.append("Cold conditions can lift heating load and scarcity risk.")
    elif avg_temp >= 30:
        score += 45
        label = "Heat-demand stress"
        evidence.append("Heat can lift cooling load and peak-price risk.")
    if avg_wind < 4:
        score += 25
        label = "Low-wind renewable stress"
        evidence.append("Low wind can reduce renewable supply.")
    elif avg_wind > 12:
        score += 15
        label = "High-wind surplus risk"
        evidence.append("High wind can increase surplus or negative-price risk.")
    if max_solar < 80:
        score += 10
        evidence.append("Low solar output weakens midday renewable supply.")

    return _driver("weather", label, score, "Weather is influencing demand or renewable output.", evidence)


def _seasonality_driver(zone: str) -> MarketContextDriver:
    month = datetime.now(timezone.utc).month
    label = "Shoulder-season baseline"
    score = 25.0
    evidence = [f"UTC calendar month {month}.", f"Zone {zone} seasonality profile applied."]
    if month in {12, 1, 2}:
        score = 58.0
        label = "Winter heating and low-solar season"
        evidence.append("Winter increases heating load and reduces solar availability.")
    elif month in {6, 7, 8}:
        score = 52.0
        label = "Summer cooling and solar season"
        evidence.append("Summer raises cooling demand while solar can depress midday prices.")
    elif month in {3, 4, 9, 10}:
        score = 38.0
        label = "Maintenance and transition season"
        evidence.append("Shoulder seasons often carry planned maintenance and volatile renewable mix.")
    return _driver("seasonality", label, score, "Seasonal demand and supply patterns are active.", evidence)


def _event_driver(shock) -> MarketContextDriver:
    score_by_level = {"normal": 20.0, "watch": 42.0, "elevated": 66.0, "severe": 86.0}
    evidence = [shock.primary_driver, *shock.risk_drivers[:3]]
    return _driver(
        "market_event",
        f"{shock.shock_level.capitalize()} event analogue",
        score_by_level.get(shock.shock_level, 20.0),
        "Historical market-event memory is contributing to current context.",
        evidence,
    )


def _infrastructure_driver(assets) -> MarketContextDriver:
    total_capacity = sum(asset.capacity_mw or 0 for asset in assets)
    largest = max((asset.capacity_mw or 0 for asset in assets), default=0)
    concentration = largest / total_capacity if total_capacity else 0
    score = 30 + min(40, concentration * 100)
    evidence = [
        f"{len(assets)} mapped assets in selected country.",
        f"Mapped capacity {total_capacity:.0f} MW.",
    ]
    if concentration > 0.35:
        evidence.append("Capacity concentration increases single-asset sensitivity.")
    return _driver(
        "infrastructure",
        "Infrastructure availability exposure",
        score,
        "Mapped assets and corridors affect reliability and congestion risk.",
        evidence,
    )


def _price_driver(prices: list[float]) -> MarketContextDriver:
    regime = classify_regime(prices)
    score_by_regime = {
        "unknown": 20.0,
        "normal": 28.0,
        "surplus": 55.0,
        "scarcity": 74.0,
        "volatile": 80.0,
    }
    evidence = regime.drivers or ["No price driver evidence available."]
    return _driver(
        "price",
        f"{regime.name.capitalize()} price regime",
        score_by_regime.get(regime.name, 35.0),
        "Price behavior indicates the current market regime.",
        evidence,
    )


def _driver(category: str, label: str, score: float, explanation: str, evidence: list[str]) -> MarketContextDriver:
    bounded = max(0.0, min(100.0, round(score, 1)))
    return MarketContextDriver(
        category=category,
        label=label,
        score=bounded,
        level=_level(bounded),
        explanation=explanation,
        evidence=evidence,
    )


def _level(score: float) -> str:
    if score >= 80:
        return "severe"
    if score >= 60:
        return "elevated"
    if score >= 40:
        return "watch"
    return "normal"


def _combined_level(drivers: list[MarketContextDriver]) -> str:
    top = max(drivers, key=lambda item: item.score).level
    elevated_count = sum(1 for driver in drivers if LEVEL_ORDER[driver.level] >= LEVEL_ORDER["elevated"])
    if elevated_count >= 2 and LEVEL_ORDER[top] < LEVEL_ORDER["severe"]:
        return "elevated"
    return top


def _scenario_tags(drivers: list[MarketContextDriver], event_signals: list[str]) -> list[str]:
    tags: list[str] = []
    for driver in drivers:
        if driver.category == "weather" and driver.score >= 40:
            if "wind" in driver.label.lower():
                tags.append("renewable_weather")
            elif "cold" in driver.label.lower():
                tags.append("cold_snap")
            elif "heat" in driver.label.lower():
                tags.append("heat_wave")
        if driver.category == "seasonality" and driver.score >= 40:
            tags.append("seasonal_demand")
        if driver.category == "infrastructure" and driver.score >= 55:
            tags.append("infrastructure_availability")
        if driver.category == "price" and driver.score >= 55:
            tags.append("price_regime_shift")
    for signal in event_signals:
        if signal not in tags:
            tags.append(signal)
    return tags[:8] or ["normal_operations"]


def _recommended_actions(context_level: str, dominant: MarketContextDriver, tags: list[str]) -> list[str]:
    actions = [
        f"Treat {dominant.label.lower()} as the primary context driver.",
        "Cross-check data quality before automated dispatch or trading actions.",
    ]
    if context_level in {"elevated", "severe"}:
        actions.append("Use manual approval for recommendations until context returns to watch or normal.")
    if "cold_snap" in tags or "heat_wave" in tags:
        actions.append("Stress-test demand forecasts and flexible load availability.")
    if "renewable_weather" in tags:
        actions.append("Review storage schedules around renewable output uncertainty.")
    if "infrastructure_availability" in tags:
        actions.append("Inspect linked infrastructure and interconnector exposure.")
    return actions[:5]


def _confidence(drivers: list[MarketContextDriver], weather_source: str, price_source: str) -> float:
    source_score = 0.72
    if weather_source != "sample":
        source_score += 0.08
    if price_source != "sample":
        source_score += 0.08
    spread = max(driver.score for driver in drivers) - min(driver.score for driver in drivers)
    source_score += min(0.07, spread / 1000)
    return round(min(0.95, source_score), 2)
