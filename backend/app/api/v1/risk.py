from fastapi import APIRouter

from app.schemas.risk import RiskStatusResponse
from app.services.risk_service import get_risk_status

router = APIRouter()


@router.get("/status", response_model=RiskStatusResponse)
def risk_status():
    return get_risk_status()