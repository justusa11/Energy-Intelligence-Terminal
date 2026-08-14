from statistics import mean, pstdev

from sqlalchemy.orm import Session

from app.repositories.price_repository import get_market_prices


BASE_CURVE = [
    ("M+1", 1.01),
    ("M+2", 1.018),
    ("Q+1", 1.035),
    ("Q+2", 1.052),
    ("Cal+1", 1.074),
    ("Cal+2", 1.041),
]


SCENARIO_FORWARD_SHIFT = {
    "base": 0.0,
    "high_wind": -6.0,
    "cold_snap": 12.0,
    "gas_spike": 9.0,
    "outage": 15.0,
}


def build_derivatives_curve(db: Session, *, country: str, zone: str, scenario: str = "base") -> dict:
    scenario = scenario if scenario in SCENARIO_FORWARD_SHIFT else "base"
    scenario_shift = SCENARIO_FORWARD_SHIFT[scenario]
    prices = list(
        reversed(
            get_market_prices(
                db,
                country_code=country,
                zone=zone,
                market="day_ahead",
                limit=168,
            )
        )
    )
    if len(prices) >= 24:
        values = [point.price for point in prices]
        recent = values[-24:]
        previous = values[-48:-24] if len(values) >= 48 else values[:-24] or recent
        recent_avg = mean(recent)
        previous_avg = mean(previous)
        volatility = min(max((pstdev(values) / recent_avg) if recent_avg else 0.0, 0.01), 0.95)
        contracts = []
        for index, (tenor, multiplier) in enumerate(BASE_CURVE):
            forward = recent_avg * multiplier + index * 0.18 + scenario_shift
            previous_forward = previous_avg * multiplier
            contracts.append(
                {
                    "tenor": tenor,
                    "forward_eur_mwh": round(forward, 2),
                    "previous_eur_mwh": round(previous_forward, 2),
                    "mark_move_eur_mwh": round(forward - previous_forward, 2),
                    "volatility": round(volatility * (1 - index * 0.045), 3),
                    "open_interest_mw": int(320 + len(values) * 3 + index * 75),
                }
            )
        return {
            "country": country,
            "zone": zone,
            "currency": "EUR",
            "unit": "MWh",
            "data_source": "ingested_market_prices",
            "scenario": scenario,
            "contracts": contracts,
        }

    fallback = []
    for index, (tenor, multiplier) in enumerate(BASE_CURVE):
        forward = 78 * multiplier + index * 0.25 + scenario_shift
        previous = 76 * multiplier
        fallback.append(
            {
                "tenor": tenor,
                "forward_eur_mwh": round(forward, 2),
                "previous_eur_mwh": round(previous, 2),
                "mark_move_eur_mwh": round(forward - previous, 2),
                "volatility": round(0.28 - index * 0.015, 3),
                "open_interest_mw": 250 + index * 60,
            }
        )
    return {
        "country": country,
        "zone": zone,
        "currency": "EUR",
        "unit": "MWh",
        "data_source": "fallback_price_curve",
        "scenario": scenario,
        "contracts": fallback,
    }
