from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.simulator import SimulationResponse
from app.services.simulator_service import run_backtest

router = APIRouter()


@router.get("/backtest", response_model=SimulationResponse)
def simulator_backtest(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    strategy: str = Query(default="battery_arbitrage"),
    days: int = Query(default=14, ge=1, le=90),
    battery_capacity_kwh: float = Query(default=100.0, gt=0, le=100000),
    battery_power_kw: float = Query(default=50.0, gt=0, le=50000),
    db: Session = Depends(get_db),
):
    return run_backtest(
        db,
        country=country,
        zone=zone,
        strategy=strategy,
        days=days,
        battery_capacity_kwh=battery_capacity_kwh,
        battery_power_kw=battery_power_kw,
    )
