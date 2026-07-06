from pydantic import BaseModel


class ScheduleSlot(BaseModel):
    hour: str
    price_eur_mwh: float
    battery_action: str  # charge | discharge | idle
    ev_charging: bool
    shiftable_load: bool


class FlexibilityResponse(BaseModel):
    country: str
    zone: str
    data_source: str
    battery_capacity_kwh: float
    battery_power_kw: float
    ev_charge_kwh: float
    shiftable_load_kwh: float
    estimated_savings_eur: float
    baseline_cost_eur: float
    optimized_cost_eur: float
    schedule: list[ScheduleSlot]
    summary: str
