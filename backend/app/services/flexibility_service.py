"""Flexibility optimizer: schedule battery, EV, and shiftable load by price.

Greedy price-rank heuristic (charge/consume in the cheapest hours,
discharge in the most expensive) — transparent, fast, and near-optimal
for a single day-ahead price curve without network constraints.
"""

from sqlalchemy.orm import Session

from app.schemas.flexibility import FlexibilityResponse, ScheduleSlot
from app.services.price_data import load_price_series


def get_flexibility_schedule(
    db: Session,
    *,
    country: str = "DK",
    zone: str = "DK1",
    battery_capacity_kwh: float = 10.0,
    battery_power_kw: float = 5.0,
    ev_charge_kwh: float = 20.0,
    ev_power_kw: float = 7.0,
    shiftable_load_kwh: float = 6.0,
    round_trip_efficiency: float = 0.9,
) -> FlexibilityResponse:
    series = load_price_series(db, country=country, zone=zone, hours=24)
    points = series.points

    if not points:
        return FlexibilityResponse(
            country=country,
            zone=zone,
            data_source=series.source,
            battery_capacity_kwh=battery_capacity_kwh,
            battery_power_kw=battery_power_kw,
            ev_charge_kwh=ev_charge_kwh,
            shiftable_load_kwh=shiftable_load_kwh,
            estimated_savings_eur=0.0,
            baseline_cost_eur=0.0,
            optimized_cost_eur=0.0,
            schedule=[],
            summary="No price data available to build a schedule.",
        )

    n = len(points)
    order_by_price = sorted(range(n), key=lambda i: points[i].price)

    # Battery: charge in the cheapest hours, discharge in the dearest.
    charge_hours_needed = max(1, round(battery_capacity_kwh / battery_power_kw))
    battery_charge = set(order_by_price[:charge_hours_needed])
    battery_discharge = set(order_by_price[-charge_hours_needed:]) - battery_charge

    # EV: charge in the cheapest remaining hours.
    ev_hours_needed = max(1, round(ev_charge_kwh / ev_power_kw))
    ev_hours = [i for i in order_by_price if i not in battery_charge][:ev_hours_needed]

    # Shiftable household/process load: next cheapest hours.
    load_hours_needed = max(1, round(shiftable_load_kwh / 2.0))
    taken = battery_charge | set(ev_hours)
    load_hours = [i for i in order_by_price if i not in taken][:load_hours_needed]

    schedule = [
        ScheduleSlot(
            hour=points[i].timestamp_utc.strftime("%H:%M"),
            price_eur_mwh=round(points[i].price, 2),
            battery_action=(
                "charge"
                if i in battery_charge
                else "discharge"
                if i in battery_discharge
                else "idle"
            ),
            ev_charging=i in ev_hours,
            shiftable_load=i in load_hours,
        )
        for i in range(n)
    ]

    prices_eur_kwh = [p.price / 1000.0 for p in points]
    average = sum(prices_eur_kwh) / n

    # Baseline: same energy consumed flat across the day.
    flexible_energy = ev_charge_kwh + shiftable_load_kwh
    baseline_cost = flexible_energy * average

    optimized_cost = sum(
        prices_eur_kwh[i] * ev_power_kw for i in ev_hours
    ) * (ev_charge_kwh / (len(ev_hours) * ev_power_kw)) + sum(
        prices_eur_kwh[i] * 2.0 for i in load_hours
    ) * (shiftable_load_kwh / (len(load_hours) * 2.0))

    # Battery arbitrage profit reduces net cost.
    charge_cost = sum(prices_eur_kwh[i] for i in battery_charge) / max(
        len(battery_charge), 1
    ) * battery_capacity_kwh
    discharge_revenue = (
        sum(prices_eur_kwh[i] for i in battery_discharge)
        / max(len(battery_discharge), 1)
        * battery_capacity_kwh
        * round_trip_efficiency
    )
    battery_profit = max(0.0, discharge_revenue - charge_cost)

    savings = max(0.0, baseline_cost - optimized_cost) + battery_profit

    summary = (
        f"Charge the battery around {schedule[min(battery_charge)].hour} and the EV in the "
        f"cheapest {len(ev_hours)} hours; run shiftable load off-peak. "
        f"Estimated saving {savings:.2f} EUR/day vs flat consumption."
    )

    return FlexibilityResponse(
        country=country,
        zone=zone,
        data_source=series.source,
        battery_capacity_kwh=battery_capacity_kwh,
        battery_power_kw=battery_power_kw,
        ev_charge_kwh=ev_charge_kwh,
        shiftable_load_kwh=shiftable_load_kwh,
        estimated_savings_eur=round(savings, 2),
        baseline_cost_eur=round(baseline_cost + charge_cost, 2),
        optimized_cost_eur=round(optimized_cost + charge_cost - battery_profit, 2),
        schedule=schedule,
        summary=summary,
    )
