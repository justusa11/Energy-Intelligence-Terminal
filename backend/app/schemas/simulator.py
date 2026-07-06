from datetime import datetime

from pydantic import BaseModel


class SimulationDay(BaseModel):
    date: str
    profit_eur: float
    cycles: float


class SimulationResponse(BaseModel):
    country: str
    zone: str
    data_source: str
    strategy: str
    days_simulated: int
    battery_capacity_kwh: float
    battery_power_kw: float
    round_trip_efficiency: float
    total_profit_eur: float
    average_daily_profit_eur: float
    best_day: SimulationDay | None
    worst_day: SimulationDay | None
    daily_results: list[SimulationDay]
    generated_at_utc: datetime
