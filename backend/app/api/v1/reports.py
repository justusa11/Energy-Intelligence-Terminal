from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.reports import ReportResponse
from app.services.report_service import build_daily_report, build_weekly_savings_report

router = APIRouter()


@router.get("/daily", response_model=ReportResponse)
def daily_report(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    return build_daily_report(db, country=country, zone=zone)


@router.get("/weekly-savings", response_model=ReportResponse)
def weekly_savings_report(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    return build_weekly_savings_report(db, country=country, zone=zone)
