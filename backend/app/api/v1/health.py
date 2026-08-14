import os
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.init_db import init_db
from app.db.session import get_db
from app.core.observability import REQUEST_ID_HEADER
from app.models.ingestion_log import IngestionLog
from app.repositories.data_quality_repository import (
    count_market_prices,
    count_weather_forecasts,
    get_latest_market_price_timestamp,
    get_latest_weather_target_timestamp,
)

router = APIRouter()

@router.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "energy-intelligence-terminal-api",
        "version": "0.1.0",
    }


@router.get("/deep")
def deep_health_check(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    checks = {
        "database": _database_check(db),
        "migrations": _migration_check(db),
        "price_data": _price_data_check(db, country=country, zone=zone),
        "weather_data": _weather_data_check(db, country=country, zone=zone),
    }
    overall = "ok" if all(check["status"] == "ok" for check in checks.values()) else "degraded"
    return {
        "status": overall,
        "country": country,
        "zone": zone,
        "checks": checks,
    }


@router.post("/init-db")
def initialize_database(x_admin_token: str | None = Header(default=None)):
    expected_token = os.getenv("INIT_DB_ADMIN_TOKEN")
    if not expected_token or x_admin_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin token required",
        )

    init_db()
    return {
        "status": "ok",
        "message": "Database tables initialized",
    }


@router.get("/ingestion-status")
def ingestion_status(
    country: str = Query(default="DK"),
    zone: str = Query(default="DK1"),
    db: Session = Depends(get_db),
):
    return {
        "country": country,
        "zone": zone,
        "providers": {
            "energi_data_service": {
                "configured": bool(os.getenv("ENERGI_DATA_SERVICE_BASE_URL")),
                "purpose": "Nordic day-ahead prices and market data.",
            },
            "open_meteo": {
                "configured": bool(os.getenv("OPEN_METEO_BASE_URL")),
                "purpose": "Weather forecasts for market zones.",
            },
            "entsoe": {
                "configured": bool(os.getenv("ENTSOE_API_KEY")),
                "purpose": "European transparency data when API credentials are available.",
            },
            "ercot": {
                "configured": bool(os.getenv("ERCOT_API_SUBSCRIPTION_KEY")),
                "purpose": "Texas ERCOT day-ahead and real-time market data after API registration.",
            },
            "jepx": {
                "configured": bool(os.getenv("JEPX_BASE_URL")),
                "purpose": "Japan Electric Power Exchange day-ahead market downloads.",
            },
        },
        "jobs": {
            "price_ingestion": _job_status(
                db,
                dataset="market_prices",
                repair_command="python pipelines/jobs/ingest_market_prices.py",
            ),
            "weather_ingestion": _job_status(
                db,
                dataset="weather_forecasts",
                repair_command="python pipelines/jobs/ingest_weather.py",
            ),
            "plant_registry": _job_status(
                db,
                dataset="european_power_plants",
                repair_command="python backend/pipelines/jobs/ingest_european_power_plants.py <csv_path> --source-year 2026",
            ),
            "external_market_ingestion": _job_status(
                db,
                dataset="external_market_prices",
                repair_command="python pipelines/jobs/ingest_external_market_prices.py --country DE",
            ),
        },
    }


@router.get("/observability")
def observability_status():
    return {
        "service": "energy-intelligence-terminal-api",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "request_id_header": REQUEST_ID_HEADER,
        "auth_gate": {
            "enabled": bool(os.getenv("APP_AUTH_TOKEN")),
            "mode": "bearer_token" if os.getenv("APP_AUTH_TOKEN") else "local_demo",
        },
        "cors_origins": [
            origin.strip()
            for origin in os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:3000").split(",")
            if origin.strip()
        ],
        "providers": {
            "energi_data_service": bool(os.getenv("ENERGI_DATA_SERVICE_BASE_URL")),
            "open_meteo": bool(os.getenv("OPEN_METEO_BASE_URL")),
            "entsoe": bool(os.getenv("ENTSOE_API_KEY")),
            "ercot": bool(os.getenv("ERCOT_API_SUBSCRIPTION_KEY")),
            "jepx": bool(os.getenv("JEPX_BASE_URL")),
        },
    }


def _database_check(db: Session) -> dict[str, object]:
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Database reachable."}
    except SQLAlchemyError:
        db.rollback()
        return {"status": "error", "message": "Database query failed."}


def _job_status(db: Session, *, dataset: str, repair_command: str) -> dict[str, object]:
    try:
        log = (
            db.query(IngestionLog)
            .filter(IngestionLog.dataset == dataset)
            .order_by(IngestionLog.started_at.desc())
            .first()
        )
    except SQLAlchemyError:
        db.rollback()
        return {
            "status": "unknown",
            "latest_run_utc": None,
            "message": "Could not query ingestion logs.",
            "repair_command": repair_command,
        }

    if not log:
        return {
            "status": "pending",
            "latest_run_utc": None,
            "rows_inserted": 0,
            "message": f"No ingestion log found for {dataset}.",
            "repair_command": repair_command,
        }

    return {
        "status": log.status,
        "latest_run_utc": log.started_at.isoformat() if log.started_at else None,
        "finished_at_utc": log.finished_at.isoformat() if log.finished_at else None,
        "rows_fetched": log.rows_fetched,
        "rows_inserted": log.rows_inserted,
        "message": log.message,
        "repair_command": repair_command if log.status != "success" else None,
    }


def _migration_check(db: Session) -> dict[str, object]:
    target_revision = _latest_local_migration_revision()
    try:
        current_revision = db.execute(text("SELECT version_num FROM alembic_version")).scalar()
    except SQLAlchemyError:
        db.rollback()
        return {
            "status": "warning",
            "current_revision": None,
            "target_revision": target_revision,
            "message": "Alembic version table is missing. Run: python -m alembic stamp head or python -m alembic upgrade head after confirming existing schema.",
            "repair_command": "python -m alembic upgrade head",
        }

    status_value = "ok" if current_revision == target_revision else "warning"
    return {
        "status": status_value,
        "current_revision": current_revision,
        "target_revision": target_revision,
        "message": "Database schema is at migration head."
        if status_value == "ok"
        else "Database schema is behind local migrations.",
        "repair_command": None if status_value == "ok" else "python -m alembic upgrade head",
    }


def _latest_local_migration_revision() -> str | None:
    versions_dir = Path(__file__).resolve().parents[3] / "migrations" / "versions"
    revisions: list[str] = []
    for path in versions_dir.glob("*.py"):
        text_value = path.read_text(encoding="utf-8")
        for line in text_value.splitlines():
            if line.startswith("revision:"):
                revisions.append(line.split("=", 1)[1].strip().strip('"'))
                break
    return sorted(revisions)[-1] if revisions else None


def _price_data_check(db: Session, *, country: str, zone: str) -> dict[str, object]:
    try:
        count = count_market_prices(db, country_code=country, zone=zone)
        latest = get_latest_market_price_timestamp(db, country_code=country, zone=zone)
    except SQLAlchemyError:
        db.rollback()
        return {"status": "error", "message": "Price data query failed."}

    return {
        "status": "ok" if count >= 24 else "warning",
        "records": count,
        "latest_timestamp_utc": latest.isoformat() if latest else None,
        "message": f"{count} day-ahead price records available.",
    }


def _weather_data_check(db: Session, *, country: str, zone: str) -> dict[str, object]:
    try:
        count = count_weather_forecasts(db, country_code=country, zone=zone)
        latest = get_latest_weather_target_timestamp(db, country_code=country, zone=zone)
    except SQLAlchemyError:
        db.rollback()
        return {"status": "error", "message": "Weather data query failed."}

    return {
        "status": "ok" if count >= 24 else "warning",
        "records": count,
        "latest_timestamp_utc": latest.isoformat() if latest else None,
        "message": f"{count} weather forecast records available.",
    }
