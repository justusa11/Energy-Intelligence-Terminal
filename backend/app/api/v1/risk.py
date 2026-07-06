from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.data_quality import DataQualityResponse
from app.schemas.risk import RiskStatusResponse
from app.services.data_quality_service import get_data_quality_status
from app.services.risk_service import get_risk_status

router = APIRouter()


@router.get("/status", response_model=RiskStatusResponse)
def risk_status(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    return get_risk_status(db, country=country, zone=zone)


@router.get("/data-quality", response_model=DataQualityResponse)
def data_quality_status(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    return get_data_quality_status(db, country=country, zone=zone)
