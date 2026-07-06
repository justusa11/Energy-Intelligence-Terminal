from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.repositories.price_repository import create_market_price


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_init_db_endpoint():
    response = client.post("/api/v1/health/init-db")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_market_overview_contract():
    response = client.get("/api/v1/market/overview")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DK"
    assert payload["zone"] == "DK1"
    assert isinstance(payload["average_price_eur_mwh"], float)
    assert isinstance(payload["peak_price_eur_mwh"], float)
    assert 0 <= payload["regime_confidence"] <= 1
    assert payload["risk_status"] in {"SAFE", "WARN", "CRITICAL"}


def test_day_ahead_prices_returns_empty_prices_when_database_has_no_rows():
    response = client.get("/api/v1/prices/day-ahead")

    assert response.status_code == 200
    payload = response.json()
    assert payload["market"] == "day_ahead"
    assert payload["unit"] == "EUR/MWh"
    assert payload["prices"] == []


def test_day_ahead_prices_returns_database_rows():
    db = SessionLocal()
    try:
        base_time = datetime(2026, 6, 4, 0, 0, tzinfo=timezone.utc)
        for hour in range(24):
            create_market_price(
                db,
                country_code="TEST",
                market="day_ahead",
                zone="T1",
                source="test",
                timestamp_utc=base_time + timedelta(hours=hour),
                price=float(hour),
                currency="EUR",
                unit="MWh",
            )
    finally:
        db.close()

    read_response = client.get("/api/v1/prices/day-ahead?country=TEST&zone=T1")

    assert read_response.status_code == 200
    read_payload = read_response.json()
    assert len(read_payload["prices"]) == 24
    assert read_payload["prices"][0]["hour"] == "00:00"
    assert read_payload["prices"][-1]["hour"] == "23:00"


def test_weather_forecast_contract():
    response = client.get("/api/v1/weather/forecast")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DK"
    assert payload["zone"] == "DK1"
    assert payload["source"] == "open_meteo"
    assert isinstance(payload["forecasts"], list)


def test_risk_status_contract():
    response = client.get("/api/v1/risk/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"SAFE", "WARN", "CRITICAL"}
    assert len(payload["checks"]) >= 1
    assert all("name" in check for check in payload["checks"])
    assert all(check["status"] in {"OK", "WARN", "FAIL"} for check in payload["checks"])


def test_data_quality_contract():
    response = client.get("/api/v1/risk/data-quality?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DK"
    assert payload["zone"] == "DK1"
    assert payload["status"] in {"OK", "WARNING", "FAILED"}
    assert len(payload["checks"]) >= 1
    assert all("name" in check for check in payload["checks"])
    assert all(check["status"] in {"OK", "WARNING", "FAILED"} for check in payload["checks"])
    assert all(check["severity"] in {"low", "medium", "high"} for check in payload["checks"])
