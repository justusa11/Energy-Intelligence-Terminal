from datetime import timezone

from sqlalchemy.orm import Session

from app.repositories.market_mark_repository import get_market_marks
from app.repositories.price_repository import get_market_prices


def build_spark_spread(
    db: Session,
    *,
    country: str,
    zone: str,
    scenario: str = "base",
    efficiency: float,
    emissions_t_mwh: float,
) -> dict:
    scenario = scenario if scenario in {"base", "gas_spike", "high_wind", "cold_snap", "outage"} else "base"
    gas_marks = list(
        reversed(
            get_market_marks(
                db,
                country_code=country,
                zone=zone,
                instrument="ttf_gas",
                limit=7,
            )
        )
    )
    carbon_marks = list(
        reversed(
            get_market_marks(
                db,
                country_code=country,
                zone=zone,
                instrument="eua_carbon",
                limit=7,
            )
        )
    )
    prices = list(
        reversed(
            get_market_prices(
                db,
                country_code=country,
                zone=zone,
                market="day_ahead",
                limit=7,
            )
        )
    )
    if len(gas_marks) >= 7 and len(carbon_marks) >= 7 and len(prices) >= 7:
        points = []
        for gas, carbon, power in zip(gas_marks, carbon_marks, prices, strict=False):
            gas_value, carbon_value, power_value = _apply_scenario(
                scenario,
                gas.value,
                carbon.value,
                power.price,
            )
            clean_cost = gas_value / efficiency + carbon_value * emissions_t_mwh
            label = power.timestamp_utc.astimezone(timezone.utc).strftime("%a")
            points.append(
                {
                    "label": label,
                    "gas_eur_mwh": round(gas_value, 2),
                    "carbon_eur_t": round(carbon_value, 2),
                    "power_eur_mwh": round(power_value, 2),
                    "clean_cost_eur_mwh": round(clean_cost, 2),
                    "clean_spark_eur_mwh": round(power_value - clean_cost, 2),
                }
            )
        return {
            "country": country,
            "zone": zone,
            "data_source": "ingested_market_marks",
            "scenario": scenario,
            "efficiency": efficiency,
            "emissions_t_mwh": emissions_t_mwh,
            "points": points,
        }

    base = [
        ("Mon", 31.4, 68.2, 86.5),
        ("Tue", 32.1, 69.1, 91.2),
        ("Wed", 30.8, 67.5, 78.4),
        ("Thu", 33.6, 70.4, 99.8),
        ("Fri", 34.2, 71.2, 104.1),
        ("Sat", 29.9, 66.8, 69.6),
        ("Sun", 30.5, 67.9, 73.3),
    ]
    points = []
    for label, gas, carbon, power in base:
        gas_value, carbon_value, power_value = _apply_scenario(scenario, gas, carbon, power)
        clean_cost = gas_value / efficiency + carbon_value * emissions_t_mwh
        points.append(
            {
                "label": label,
                "gas_eur_mwh": round(gas_value, 2),
                "carbon_eur_t": round(carbon_value, 2),
                "power_eur_mwh": round(power_value, 2),
                "clean_cost_eur_mwh": round(clean_cost, 2),
                "clean_spark_eur_mwh": round(power_value - clean_cost, 2),
            }
        )
    return {
        "country": country,
        "zone": zone,
        "data_source": "fallback_market_marks",
        "scenario": scenario,
        "efficiency": efficiency,
        "emissions_t_mwh": emissions_t_mwh,
        "points": points,
    }


def _apply_scenario(scenario: str, gas: float, carbon: float, power: float) -> tuple[float, float, float]:
    if scenario == "gas_spike":
        return gas * 1.35, carbon * 1.08, power + 14
    if scenario == "high_wind":
        return gas * 0.94, carbon * 0.98, power - 12
    if scenario == "cold_snap":
        return gas * 1.18, carbon * 1.04, power + 22
    if scenario == "outage":
        return gas * 1.08, carbon * 1.02, power + 18
    return gas, carbon, power
