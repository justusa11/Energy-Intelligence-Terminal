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


def test_forecast_contract():
    response = client.get("/api/v1/forecast/day-ahead?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DK"
    assert payload["zone"] == "DK1"
    assert payload["model"] in {"ridge_regression_v1", "seasonal_naive"}
    assert len(payload["points"]) == 24
    assert payload["regime"]["name"] in {"normal", "surplus", "scarcity", "volatile", "unknown"}
    assert 0 <= payload["regime"]["confidence"] <= 1
    assert payload["metrics"]["mae"] >= 0


def test_screener_contract():
    response = client.get("/api/v1/screener/opportunities?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["spike_risk"] in {"low", "medium", "high"}
    assert payload["negative_price_risk"] in {"low", "medium", "high"}
    assert len(payload["cheapest_hours"]) >= 1
    assert len(payload["most_expensive_hours"]) >= 1
    assert payload["price_spread_eur_mwh"] >= 0


def test_flexibility_contract():
    response = client.get("/api/v1/flexibility/schedule?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["schedule"]) == 24
    assert payload["estimated_savings_eur"] >= 0
    actions = {slot["battery_action"] for slot in payload["schedule"]}
    assert actions <= {"charge", "discharge", "idle"}
    assert "charge" in actions


def test_simulator_contract():
    response = client.get(
        "/api/v1/simulator/backtest?country=DK&zone=DK1&strategy=battery_arbitrage&days=7"
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["strategy"] == "battery_arbitrage"
    assert payload["days_simulated"] >= 1
    assert isinstance(payload["total_profit_eur"], float)
    assert len(payload["daily_results"]) == payload["days_simulated"]


def test_advisor_contract():
    response = client.post(
        "/api/v1/advisor/ask",
        json={"question": "When is electricity cheapest today?", "country": "DK", "zone": "DK1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["answer"]
    assert "screener" in payload["sources"]
    assert len(payload["suggested_questions"]) >= 3


def test_reports_contract():
    daily = client.get("/api/v1/reports/daily?country=DK&zone=DK1")
    weekly = client.get("/api/v1/reports/weekly-savings?country=DK&zone=DK1")

    assert daily.status_code == 200
    assert weekly.status_code == 200
    assert daily.json()["report_type"] == "daily"
    assert weekly.json()["report_type"] == "weekly_savings"
    assert daily.json()["markdown"].startswith("# ")
    assert len(daily.json()["sections"]) >= 4


def test_countries_contract():
    response = client.get("/api/v1/market/countries")

    assert response.status_code == 200
    payload = response.json()
    codes = {c["code"] for c in payload["countries"]}
    assert {"DK", "DE", "US", "JP"} <= codes
    dk = next(c for c in payload["countries"] if c["code"] == "DK")
    assert {z["code"] for z in dk["zones"]} == {"DK1", "DK2"}


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
