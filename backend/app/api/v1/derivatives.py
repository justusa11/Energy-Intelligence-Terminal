from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.derivatives_service import build_derivatives_curve

router = APIRouter()


@router.get("/curve")
def derivatives_curve(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    scenario: str = Query(default="base"),
    db: Session = Depends(get_db),
):
    return build_derivatives_curve(db, country=country, zone=zone, scenario=scenario)
