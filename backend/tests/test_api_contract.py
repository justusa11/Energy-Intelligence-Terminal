from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")

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


def test_day_ahead_prices_contract():
    response = client.get("/api/v1/prices/day-ahead")

    assert response.status_code == 200
    payload = response.json()
    assert payload["market"] == "day_ahead"
    assert payload["unit"] == "EUR/MWh"
    assert len(payload["prices"]) == 24
    assert payload["prices"][0]["hour"] == "00:00"
    assert payload["prices"][-1]["hour"] == "23:00"


def test_weather_forecast_contract():
    response = client.get("/api/v1/weather/forecast")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DK"
    assert payload["zone"] == "DK1"
    assert isinstance(payload["temperature_c"], float)
    assert isinstance(payload["wind_speed_ms"], float)
    assert isinstance(payload["solar_radiation_wm2"], float)


def test_risk_status_contract():
    response = client.get("/api/v1/risk/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"SAFE", "WARN", "CRITICAL"}
    assert len(payload["checks"]) >= 1
    assert all("name" in check for check in payload["checks"])
    assert all(check["status"] in {"OK", "WARN", "FAIL"} for check in payload["checks"])
