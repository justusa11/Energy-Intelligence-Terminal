from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.main import app
from app.models.energy_market_mark import EnergyMarketMark
from app.repositories.price_repository import create_market_price


client = TestClient(app)
init_db()


def test_health_endpoint():
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "x-request-id" in response.headers


def test_api_auth_gate_allows_demo_mode_without_token(monkeypatch):
    monkeypatch.delenv("APP_AUTH_TOKEN", raising=False)

    response = client.get("/api/v1/market/overview")

    assert response.status_code == 200


def test_api_auth_gate_blocks_protected_routes_when_enabled(monkeypatch):
    monkeypatch.setenv("APP_AUTH_TOKEN", "test-app-token")

    response = client.get("/api/v1/market/overview")

    assert response.status_code == 401
    payload = response.json()
    assert payload["error"]["code"] == "authentication_required"


def test_api_auth_gate_accepts_bearer_token_when_enabled(monkeypatch):
    monkeypatch.setenv("APP_AUTH_TOKEN", "test-app-token")

    response = client.get(
        "/api/v1/market/overview",
        headers={"Authorization": "Bearer test-app-token"},
    )

    assert response.status_code == 200


def test_api_auth_gate_keeps_health_open_when_enabled(monkeypatch):
    monkeypatch.setenv("APP_AUTH_TOKEN", "test-app-token")

    response = client.get("/api/v1/health")

    assert response.status_code == 200


def test_deep_health_endpoint_reports_dependency_checks():
    response = client.get("/api/v1/health/deep?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ok", "degraded"}
    assert payload["checks"]["database"]["status"] == "ok"
    assert payload["checks"]["migrations"]["status"] in {"ok", "warning", "error"}
    assert "current_revision" in payload["checks"]["migrations"]
    assert "target_revision" in payload["checks"]["migrations"]
    assert payload["checks"]["price_data"]["status"] in {"ok", "warning"}
    assert payload["checks"]["weather_data"]["status"] in {"ok", "warning"}


def test_init_db_endpoint_requires_admin_token():
    response = client.post("/api/v1/health/init-db")

    assert response.status_code == 403


def test_init_db_endpoint_accepts_admin_token(monkeypatch):
    monkeypatch.setenv("INIT_DB_ADMIN_TOKEN", "test-admin-token")

    response = client.post(
        "/api/v1/health/init-db",
        headers={"x-admin-token": "test-admin-token"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ingestion_status_endpoint_reports_providers_and_jobs():
    response = client.get("/api/v1/health/ingestion-status?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DK"
    assert payload["zone"] == "DK1"
    assert "providers" in payload
    assert {"energi_data_service", "open_meteo", "entsoe", "ercot", "jepx"} <= set(payload["providers"])
    assert all("configured" in provider for provider in payload["providers"].values())
    assert "jobs" in payload
    assert {
        "price_ingestion",
        "weather_ingestion",
        "plant_registry",
        "external_market_ingestion",
        "system_heartbeat",
    } <= set(payload["jobs"])
    assert all("repair_command" in job for job in payload["jobs"].values())


def test_observability_endpoint_reports_runtime_readiness():
    response = client.get("/api/v1/health/observability")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "energy-intelligence-terminal-api"
    assert "request_id_header" in payload
    assert "auth_gate" in payload
    assert "providers" in payload


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


def test_day_ahead_prices_returns_sample_prices_when_database_has_no_rows():
    response = client.get("/api/v1/prices/day-ahead")

    assert response.status_code == 200
    payload = response.json()
    assert payload["market"] == "day_ahead"
    assert payload["unit"] == "EUR/MWh"
    assert len(payload["prices"]) == 24
    assert all(
        "hour" in point and "timestamp_utc" in point and "price_eur_mwh" in point
        for point in payload["prices"]
    )


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
    assert read_payload["prices"][0]["timestamp_utc"] == "2026-06-04T00:00:00+00:00"
    assert read_payload["prices"][-1]["hour"] == "23:00"


def test_day_ahead_prices_falls_back_when_live_zone_database_rows_are_stale():
    db = SessionLocal()
    try:
        base_time = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0) - timedelta(days=10)
        for hour in range(24):
            create_market_price(
                db,
                country_code="DK",
                market="day_ahead",
                zone="DK1",
                source="stale-test",
                timestamp_utc=base_time + timedelta(hours=hour),
                price=float(hour),
                currency="EUR",
                unit="MWh",
            )
    finally:
        db.close()

    response = client.get("/api/v1/prices/day-ahead?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data_source"] == "stale_database_sample_fallback"
    assert len(payload["prices"]) == 24


def test_day_ahead_prices_aggregates_quarter_hour_rows_to_hourly_buckets():
    db = SessionLocal()
    try:
        base_time = datetime(2026, 8, 14, 0, 0, tzinfo=timezone.utc)
        for quarter in range(96):
            create_market_price(
                db,
                country_code="TEST",
                market="day_ahead",
                zone="QH1",
                source="quarter-hour-test",
                timestamp_utc=base_time + timedelta(minutes=15 * quarter),
                price=float(40 + quarter),
                currency="EUR",
                unit="MWh",
            )
    finally:
        db.close()

    response = client.get("/api/v1/prices/day-ahead?country=TEST&zone=QH1")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["prices"]) == 24
    assert payload["prices"][0]["hour"] == "00:00"
    assert payload["prices"][-1]["hour"] == "23:00"
    assert payload["prices"][0]["price_eur_mwh"] == 41.5


def test_weather_forecast_contract():
    response = client.get("/api/v1/weather/forecast")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DK"
    assert payload["zone"] == "DK1"
    assert payload["source"] in {"open_meteo", "sample"}
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
    assert 0 <= payload["confidence"] <= 1
    assert len(payload["drivers"]) >= 1
    assert "price_source" in payload["feature_summary"]


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
    assert all("table" in check for check in payload["checks"])
    assert all("repair_command" in check for check in payload["checks"])


def test_data_quality_failed_checks_explain_repair_path():
    response = client.get("/api/v1/risk/data-quality?country=NOPE&zone=NOPE1")

    assert response.status_code == 200
    payload = response.json()
    failed = [check for check in payload["checks"] if check["status"] == "FAILED"]
    assert failed
    assert all(check["expected"] for check in failed)
    assert all(check["repair_command"] for check in failed)
    assert any("ingest_market_prices.py" in check["repair_command"] for check in failed)
    assert any("ingest_weather.py" in check["repair_command"] for check in failed)


def test_derivatives_curve_contract():
    response = client.get("/api/v1/derivatives/curve?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DK"
    assert payload["zone"] == "DK1"
    assert len(payload["contracts"]) >= 1
    contract = payload["contracts"][0]
    assert {"tenor", "forward_eur_mwh", "volatility", "open_interest_mw"} <= set(contract)


def test_derivatives_curve_uses_ingested_prices_when_available():
    db = SessionLocal()
    try:
        base_time = datetime(2026, 7, 1, 0, 0, tzinfo=timezone.utc)
        for hour in range(72):
            create_market_price(
                db,
                country_code="TDD",
                market="day_ahead",
                zone="TDD1",
                source="contract-test",
                timestamp_utc=base_time + timedelta(hours=hour),
                price=60 + (hour % 24) * 0.75,
            )
    finally:
        db.close()

    response = client.get("/api/v1/derivatives/curve?country=TDD&zone=TDD1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data_source"] == "ingested_market_prices"
    assert len(payload["contracts"]) >= 4
    assert payload["contracts"][0]["forward_eur_mwh"] > 0


def test_derivatives_curve_marks_known_live_zone_stale_when_rows_are_old():
    db = SessionLocal()
    try:
        base_time = datetime(2026, 7, 1, 0, 0, tzinfo=timezone.utc)
        for hour in range(72):
            create_market_price(
                db,
                country_code="DK",
                market="day_ahead",
                zone="DK1",
                source="stale-derivatives-test",
                timestamp_utc=base_time + timedelta(hours=hour),
                price=60 + (hour % 24) * 0.75,
            )
    finally:
        db.close()

    response = client.get("/api/v1/derivatives/curve?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data_source"] == "stale_database_sample_fallback"
    assert len(payload["contracts"]) >= 4


def test_derivatives_curve_accepts_market_scenario():
    base = client.get("/api/v1/derivatives/curve?country=DK&zone=DK1")
    stressed = client.get("/api/v1/derivatives/curve?country=DK&zone=DK1&scenario=outage")

    assert base.status_code == 200
    assert stressed.status_code == 200
    assert stressed.json()["scenario"] == "outage"
    assert stressed.json()["contracts"][0]["forward_eur_mwh"] >= base.json()["contracts"][0]["forward_eur_mwh"]


def test_gas_carbon_contract():
    response = client.get("/api/v1/gas-carbon/spark-spread?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DK"
    assert payload["zone"] == "DK1"
    assert len(payload["points"]) == 7
    assert {"label", "gas_eur_mwh", "carbon_eur_t", "power_eur_mwh", "clean_spark_eur_mwh"} <= set(payload["points"][0])


def test_gas_carbon_uses_market_marks_when_available():
    db = SessionLocal()
    try:
        base_time = datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc)
        for day in range(7):
            db.add_all(
                [
                    EnergyMarketMark(
                        country_code="TDD",
                        zone="TDD1",
                        instrument="ttf_gas",
                        unit="EUR/MWh",
                        source="contract-test",
                        timestamp_utc=base_time + timedelta(days=day),
                        value=31 + day,
                    ),
                    EnergyMarketMark(
                        country_code="TDD",
                        zone="TDD1",
                        instrument="eua_carbon",
                        unit="EUR/t",
                        source="contract-test",
                        timestamp_utc=base_time + timedelta(days=day),
                        value=70 + day,
                    ),
                ]
            )
            create_market_price(
                db,
                country_code="TDD",
                market="day_ahead",
                zone="TDD1",
                source="contract-test",
                timestamp_utc=base_time + timedelta(days=day),
                price=100 + day,
            )
        db.commit()
    finally:
        db.close()

    response = client.get("/api/v1/gas-carbon/spark-spread?country=TDD&zone=TDD1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data_source"] == "ingested_market_marks"
    assert len(payload["points"]) == 7
    assert payload["points"][0]["gas_eur_mwh"] == 31


def test_gas_carbon_scenario_adjusts_market_marks():
    base = client.get("/api/v1/gas-carbon/spark-spread?country=DK&zone=DK1")
    gas_spike = client.get("/api/v1/gas-carbon/spark-spread?country=DK&zone=DK1&scenario=gas_spike")

    assert base.status_code == 200
    assert gas_spike.status_code == 200
    assert gas_spike.json()["scenario"] == "gas_spike"
    assert gas_spike.json()["points"][0]["gas_eur_mwh"] > base.json()["points"][0]["gas_eur_mwh"]


def test_gis_assets_contract():
    response = client.get("/api/v1/gis/assets")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["assets"]) >= 5
    assert len(payload["links"]) >= 3
    assert {"id", "name", "type", "lon", "lat"} <= set(payload["assets"][0])


def test_gis_assets_returns_european_power_plant_fleet_with_source_metadata():
    response = client.get("/api/v1/gis/assets?region=europe&asset_type=power_plant")

    assert response.status_code == 200
    payload = response.json()
    assert payload["region"] == "europe"
    assert payload["data_source"] in {"seeded_european_fleet", "infrastructure_database"}
    assert len(payload["assets"]) >= 25
    assert all(asset["type"] == "power_plant" for asset in payload["assets"])
    assert {"fuel_type", "capacity_mw", "country", "source"} <= set(payload["assets"][0])


def test_gis_assets_returns_global_market_coverage_for_registered_regions():
    response = client.get("/api/v1/gis/assets?region=global&asset_type=all")

    assert response.status_code == 200
    payload = response.json()
    countries = {asset["country"] for asset in payload["assets"]}
    zones = {asset["zone"] for asset in payload["assets"]}
    asset_ids = {asset["id"] for asset in payload["assets"]}
    assert {"DE", "US", "JP"} <= countries
    assert {"DE-LU", "ERCOT", "JP-TK"} <= zones
    assert {"ercot-houston", "jp-futtsu", "de-arkona"} <= asset_ids


def test_gis_assets_can_filter_texas_and_japan():
    texas = client.get("/api/v1/gis/assets?region=global&country=US&asset_type=all")
    japan = client.get("/api/v1/gis/assets?region=global&country=JP&asset_type=all")

    assert texas.status_code == 200
    assert japan.status_code == 200
    assert texas.json()["assets"]
    assert japan.json()["assets"]
    assert all(asset["country"] == "US" for asset in texas.json()["assets"])
    assert all(asset["country"] == "JP" for asset in japan.json()["assets"])


def test_market_event_history_returns_structured_events_for_major_regions():
    for country, zone in [("DE", "DE-LU"), ("US", "ERCOT"), ("JP", "JP-TK")]:
        response = client.get(f"/api/v1/market-events/history?country={country}&zone={zone}")

        assert response.status_code == 200
        payload = response.json()
        assert payload["country"] == country
        assert payload["zone"] == zone
        assert payload["events"]
        event = payload["events"][0]
        assert {
            "id",
            "name",
            "event_type",
            "start_date",
            "end_date",
            "severity",
            "affected_countries",
            "affected_zones",
            "commodities",
            "market_impact",
            "playbook",
        } <= set(event)
        assert event["playbook"]
        assert event["market_impact"]


def test_market_event_shock_analysis_returns_analogues_and_playbook():
    response = client.get("/api/v1/market-events/shock-analysis?country=DE&zone=DE-LU")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DE"
    assert payload["zone"] == "DE-LU"
    assert payload["shock_level"] in {"normal", "watch", "elevated", "severe"}
    assert payload["primary_driver"]
    assert len(payload["analogues"]) >= 1
    assert len(payload["risk_drivers"]) >= 1
    assert len(payload["recommended_actions"]) >= 2
    assert payload["analogues"][0]["similarity_score"] > 0


def test_market_event_history_includes_operational_enrichment():
    response = client.get("/api/v1/market-events/history?country=US&zone=ERCOT")

    assert response.status_code == 200
    event = response.json()["events"][0]
    assert event["impact_metrics"]["peak_price_change_pct"] > 0
    assert event["impact_metrics"]["volatility_change_pct"] > 0
    assert event["linked_asset_ids"]
    assert event["timeline"]
    assert {"phase", "date", "description"} <= set(event["timeline"][0])
    assert event["scenario_templates"]
    assert {"id", "label", "description", "severity"} <= set(event["scenario_templates"][0])
    assert event["confidence_labels"]
    assert {"claim", "confidence", "basis"} <= set(event["confidence_labels"][0])


def test_market_event_watchlist_returns_signals_and_operator_note_guidance():
    response = client.get("/api/v1/market-events/watchlist?country=JP&zone=JP-TK")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "JP"
    assert payload["zone"] == "JP-TK"
    assert payload["signals"]
    assert {"id", "label", "severity", "description", "related_event_ids", "scenario_template_ids"} <= set(
        payload["signals"][0]
    )
    assert payload["operator_note_guidance"]["storage"] == "local_browser"
    assert payload["operator_note_guidance"]["max_length"] > 0


def test_market_context_combines_weather_season_events_infrastructure_and_prices():
    response = client.get("/api/v1/context/market-context?country=DK&zone=DK1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["country"] == "DK"
    assert payload["zone"] == "DK1"
    assert payload["context_level"] in {"normal", "watch", "elevated", "severe"}
    assert payload["dominant_driver"] in {
        "weather",
        "seasonality",
        "market_event",
        "infrastructure",
        "price",
    }
    categories = {driver["category"] for driver in payload["drivers"]}
    assert {"weather", "seasonality", "market_event", "infrastructure", "price"} <= categories
    assert all(0 <= driver["score"] <= 100 for driver in payload["drivers"])
    assert payload["recommended_actions"]
    assert payload["scenario_tags"]
    assert 0 <= payload["confidence"] <= 1
    assert {"weather", "prices", "events", "infrastructure"} <= set(payload["data_sources"])


def test_infrastructure_summary_contract():
    response = client.get("/api/v1/infrastructure/summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["asset_count"] >= 5
    assert payload["corridor_count"] >= 3
    assert "countries" in payload


def test_infrastructure_summary_groups_european_capacity_by_fuel():
    response = client.get("/api/v1/infrastructure/summary?region=europe")

    assert response.status_code == 200
    payload = response.json()
    assert payload["region"] == "europe"
    assert payload["asset_count"] >= 25
    assert payload["capacity_by_fuel_mw"]["nuclear"] > 0
    assert payload["capacity_by_fuel_mw"]["wind"] > 0


def test_gis_asset_context_answers_operator_questions():
    response = client.get("/api/v1/gis/assets/dk1-zone/context")

    assert response.status_code == 200
    payload = response.json()
    assert payload["asset"]["id"] == "dk1-zone"
    assert payload["asset"]["type"] == "market_zone"
    assert payload["headline"]
    assert payload["why_it_matters"]
    assert payload["operator_actions"]
    assert payload["market_context"]["zone"] == "DK1"
    assert {"level", "driver", "confidence"} <= set(payload["risk"])
    assert "prices" in payload["data_sources"]
