from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.flexibility import FlexibilityResponse
from app.services.flexibility_service import get_flexibility_schedule

router = APIRouter()


@router.get("/schedule", response_model=FlexibilityResponse)
def flexibility_schedule(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    battery_capacity_kwh: float = Query(default=10.0, ge=0, le=10000),
    battery_power_kw: float = Query(default=5.0, gt=0, le=5000),
    ev_charge_kwh: float = Query(default=20.0, ge=0, le=500),
    shiftable_load_kwh: float = Query(default=6.0, ge=0, le=1000),
    db: Session = Depends(get_db),
):
    return get_flexibility_schedule(
        db,
        country=country,
        zone=zone,
        battery_capacity_kwh=battery_capacity_kwh,
        battery_power_kw=battery_power_kw,
        ev_charge_kwh=ev_charge_kwh,
        shiftable_load_kwh=shiftable_load_kwh,
    )
