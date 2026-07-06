"""Trading simulator: backtest simple storage strategies on price history."""

from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.schemas.simulator import SimulationDay, SimulationResponse
from app.services.price_data import load_price_series

STRATEGIES = {"battery_arbitrage", "peak_offpeak"}


def run_backtest(
    db: Session,
    *,
    country: str = "DK",
    zone: str = "DK1",
    strategy: str = "battery_arbitrage",
    days: int = 14,
    battery_capacity_kwh: float = 100.0,
    battery_power_kw: float = 50.0,
    round_trip_efficiency: float = 0.9,
) -> SimulationResponse:
    if strategy not in STRATEGIES:
        strategy = "battery_arbitrage"

    series = load_price_series(db, country=country, zone=zone, hours=days * 24)

    by_day: dict[str, list] = defaultdict(list)
    for point in series.points:
        by_day[point.timestamp_utc.strftime("%Y-%m-%d")].append(point)

    daily_results: list[SimulationDay] = []
    for day, points in sorted(by_day.items()):
        if len(points) < 12:
            continue
        if strategy == "battery_arbitrage":
            profit, cycles = _battery_arbitrage_day(
                points, battery_capacity_kwh, battery_power_kw, round_trip_efficiency
            )
        else:
            profit, cycles = _peak_offpeak_day(
                points, battery_capacity_kwh, round_trip_efficiency
            )
        daily_results.append(
            SimulationDay(date=day, profit_eur=round(profit, 2), cycles=round(cycles, 2))
        )

    total = sum(d.profit_eur for d in daily_results)
    best = max(daily_results, key=lambda d: d.profit_eur, default=None)
    worst = min(daily_results, key=lambda d: d.profit_eur, default=None)

    return SimulationResponse(
        country=country,
        zone=zone,
        data_source=series.source,
        strategy=strategy,
        days_simulated=len(daily_results),
        battery_capacity_kwh=battery_capacity_kwh,
        battery_power_kw=battery_power_kw,
        round_trip_efficiency=round_trip_efficiency,
        total_profit_eur=round(total, 2),
        average_daily_profit_eur=round(total / len(daily_results), 2)
        if daily_results
        else 0.0,
        best_day=best,
        worst_day=worst,
        daily_results=daily_results,
        generated_at_utc=datetime.now(timezone.utc),
    )


def _battery_arbitrage_day(points, capacity_kwh, power_kw, efficiency):
    """Charge in the N cheapest hours, discharge in the N dearest hours."""
    hours_needed = max(1, round(capacity_kwh / power_kw))
    ranked = sorted(points, key=lambda p: p.price)
    charge = ranked[:hours_needed]
    discharge = ranked[-hours_needed:]

    charge_cost = sum(p.price / 1000.0 * power_kw for p in charge)
    discharge_revenue = sum(
        p.price / 1000.0 * power_kw * efficiency for p in discharge
    )
    cycles = min(1.0, hours_needed * power_kw / capacity_kwh)
    return discharge_revenue - charge_cost, cycles


def _peak_offpeak_day(points, capacity_kwh, efficiency):
    """Fixed schedule: charge 00-06 average price, discharge 17-21."""
    offpeak = [p.price for p in points if 0 <= p.timestamp_utc.hour < 6]
    peak = [p.price for p in points if 17 <= p.timestamp_utc.hour < 21]
    if not offpeak or not peak:
        return 0.0, 0.0

    buy = sum(offpeak) / len(offpeak) / 1000.0 * capacity_kwh
    sell = sum(peak) / len(peak) / 1000.0 * capacity_kwh * efficiency
    return sell - buy, 1.0
