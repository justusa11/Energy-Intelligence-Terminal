from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.gas_carbon_service import build_spark_spread

router = APIRouter()


@router.get("/spark-spread")
def spark_spread(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    scenario: str = Query(default="base"),
    efficiency: float = Query(default=0.52, ge=0.25, le=0.75),
    emissions_t_mwh: float = Query(default=0.37, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    return build_spark_spread(
        db,
        country=country,
        zone=zone,
        scenario=scenario,
        efficiency=efficiency,
        emissions_t_mwh=emissions_t_mwh,
    )
