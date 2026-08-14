# API Reference

Base URL (local): `http://localhost:8000/api/v1`
Interactive docs: `http://localhost:8000/docs` (Swagger) and `/redoc`.

Common query params on analytics endpoints:

- `country` — ISO-ish code: `DK`, `DE`, `US`, `JP` (default `DK`).
- `zone` — bidding zone: `DK1`, `DK2`, `DE-LU`, `ERCOT`, `JP-TK` (default `DK1`).

Every analytics response includes `data_source: "database" | "sample"` so a
client can tell whether it is looking at ingested or synthetic data.

---

## Health

### `GET /health`
```json
{ "status": "ok" }
```

### `GET /health/deep?country=DK&zone=DK1`
Checks API dependencies, migration status, and data availability.
```json
{
  "status": "ok",
  "country": "DK",
  "zone": "DK1",
  "checks": {
    "database": { "status": "ok", "message": "Database reachable." },
    "price_data": { "status": "ok", "records": 24 },
    "weather_data": { "status": "ok", "records": 24 }
  }
}
```

### `GET /health/ingestion-status?country=DK&zone=DK1`
Returns provider configuration status plus repair commands for ingestion jobs.
The response reports whether providers are configured but does not expose secret
values.

### `POST /health/init-db`
Initializes database tables. This is an admin operation and requires
`x-admin-token: $INIT_DB_ADMIN_TOKEN`; otherwise it returns `403`.

---

## Market

### `GET /market/overview?country=DK&zone=DK1`
```json
{
  "country": "DK", "zone": "DK1",
  "average_price_eur_mwh": 78.4,
  "peak_price_eur_mwh": 141.2,
  "cheapest_hour": "03:00-04:00",
  "market_regime": "Normal",
  "regime_confidence": 0.75,
  "risk_status": "SAFE",
  "recommendation": "Shift flexible consumption to around 03:00 ..."
}
```

### `GET /market/countries`
Returns the country/zone registry (used to build selectors).
```json
{
  "countries": [
    { "code": "DK", "name": "Denmark", "timezone": "Europe/Copenhagen",
      "zones": [
        { "code": "DK1", "name": "West Denmark", "data_mode": "live", "currency": "EUR" },
        { "code": "DK2", "name": "East Denmark", "data_mode": "live", "currency": "EUR" }
      ] }
  ]
}
```

---

## Prices

### `GET /prices/day-ahead?country=DK&zone=DK1`
Stored hourly prices. If the DB has no rows for the requested zone, the endpoint
returns the deterministic sample fallback used by the analytics modules so DE,
ERCOT, and JP-TK remain usable in demos.
```json
{ "country": "DK", "zone": "DK1", "market": "day_ahead", "unit": "EUR/MWh",
  "prices": [ { "hour": "00:00", "price_eur_mwh": 42.1 } ] }
```

---

## Forecast

### `GET /forecast/day-ahead?country=DK&zone=DK1&horizon_hours=24`
```json
{
  "country": "DK", "zone": "DK1",
  "model": "ridge_regression_v1",
  "data_source": "database",
  "generated_at_utc": "2026-07-06T12:00:00Z",
  "metrics": { "mae": 2.2, "rmse": 2.5, "sample_hours": 24 },
  "regime": { "name": "normal", "confidence": 0.75, "drivers": ["..."] },
  "points": [ { "target_time_utc": "2026-07-06T13:00:00Z", "predicted_price_eur_mwh": 79.2 } ]
}
```
`model` is `ridge_regression_v1` when ≥72h of history exists, else
`seasonal_naive`. `metrics` come from a holdout backtest of the most recent day.

---

## Weather

### `GET /weather/forecast?country=DK&zone=DK1`
```json
{ "country": "DK", "zone": "DK1", "source": "open_meteo",
  "forecasts": [ { "target_time_utc": "...", "temperature_2m_c": 14.2,
    "wind_speed_10m_ms": 6.1, "wind_speed_100m_ms": 9.4,
    "shortwave_radiation_wm2": 220.0, "precipitation_mm": 0.0 } ] }
```
If no stored weather rows exist, `source` is `"sample"` and the endpoint returns
a deterministic 24-hour weather curve for the requested zone.

---

## Internal Market Context

### `GET /context/market-context?country=DK&zone=DK1`
Combines weather, seasonality, historical market-event analogues,
infrastructure exposure, and price behavior into one operator explanation.
This endpoint is retained as a backend support contract. It is not currently a
primary frontend module.

```json
{
  "country": "DK",
  "zone": "DK1",
  "context_level": "elevated",
  "dominant_driver": "weather",
  "confidence": 0.84,
  "scenario_tags": ["renewable_weather", "seasonal_demand", "gas_spike"],
  "recommended_actions": [
    "Treat low-wind renewable stress as the primary context driver."
  ],
  "data_sources": {
    "weather": "sample",
    "prices": "database",
    "events": "curated_market_event_ledger",
    "infrastructure": "infrastructure_database"
  },
  "drivers": [
    {
      "category": "weather",
      "label": "Low-wind renewable stress",
      "score": 76,
      "level": "elevated",
      "explanation": "Wind generation conditions are weak; thermal imports or storage may set marginal price more often.",
      "evidence": ["Average 100m wind 3.1 m/s."]
    }
  ]
}
```

---

## Screener

### `GET /screener/opportunities?country=DK&zone=DK1`
```json
{
  "country": "DK", "zone": "DK1", "data_source": "sample",
  "cheapest_hours": [ { "hour": "03:00", "price_eur_mwh": 33.0 } ],
  "most_expensive_hours": [ { "hour": "18:00", "price_eur_mwh": 141.0 } ],
  "average_price_eur_mwh": 78.4,
  "price_spread_eur_mwh": 108.0,
  "spike_risk": "low", "negative_price_risk": "low",
  "opportunities": [ { "kind": "load_shift", "title": "...", "detail": "...", "severity": "opportunity" } ]
}
```

---

## Flexibility

### `GET /flexibility/schedule?country=DK&zone=DK1`
Optional params: `battery_capacity_kwh`, `battery_power_kw`, `ev_charge_kwh`,
`shiftable_load_kwh`.
```json
{
  "country": "DK", "zone": "DK1", "data_source": "sample",
  "battery_capacity_kwh": 10.0, "battery_power_kw": 5.0,
  "ev_charge_kwh": 20.0, "shiftable_load_kwh": 6.0,
  "estimated_savings_eur": 1.47,
  "baseline_cost_eur": 2.51, "optimized_cost_eur": 1.04,
  "schedule": [ { "hour": "03:00", "price_eur_mwh": 33.0,
    "battery_action": "charge", "ev_charging": true, "shiftable_load": false } ],
  "summary": "Charge the battery around 03:00 ..."
}
```

---

## Simulator

### `GET /simulator/backtest?country=DK&zone=DK1&strategy=battery_arbitrage&days=14`
`strategy` ∈ `battery_arbitrage` | `peak_offpeak`. Optional:
`battery_capacity_kwh`, `battery_power_kw`.
```json
{
  "strategy": "battery_arbitrage", "days_simulated": 14,
  "battery_capacity_kwh": 100.0, "battery_power_kw": 50.0,
  "round_trip_efficiency": 0.9,
  "total_profit_eur": 156.2, "average_daily_profit_eur": 11.2,
  "best_day": { "date": "2026-07-01", "profit_eur": 18.4, "cycles": 1.0 },
  "worst_day": { "date": "2026-07-05", "profit_eur": 4.1, "cycles": 1.0 },
  "daily_results": [ { "date": "2026-07-01", "profit_eur": 18.4, "cycles": 1.0 } ],
  "data_source": "sample", "generated_at_utc": "..."
}
```

---

## Risk

### `GET /risk/status?country=DK&zone=DK1`
```json
{ "status": "SAFE",
  "checks": [ { "name": "Price data freshness", "status": "OK", "severity": "low" } ] }
```
`status` ∈ `SAFE` | `WARN` | `CRITICAL`. Check `status` ∈ `OK` | `WARN` | `FAIL`.

### `GET /risk/data-quality?country=DK&zone=DK1`
```json
{ "country": "DK", "zone": "DK1", "status": "OK",
  "checks": [ { "name": "Price coverage", "status": "OK", "severity": "low",
    "message": "24 price records available." } ] }
```
Here check `status` ∈ `OK` | `WARNING` | `FAILED` (data-quality vocabulary,
distinct from the risk gate).

---

## AI Advisor

### `POST /advisor/ask`
Body:
```json
{ "question": "When is electricity cheapest today?", "country": "DK", "zone": "DK1" }
```
Response:
```json
{ "question": "...", "answer": "Cheapest hours (EUR/MWh): 03:00 (33) ...",
  "sources": ["screener"], "suggested_questions": ["..."] }
```
The answer is composed deterministically from the other services. `sources`
lists which services contributed. To plug in an LLM, replace
`advisor_service.answer_question`; the contract is unchanged.

### `GET /advisor/suggested-questions`
```json
{ "questions": ["What is the market doing right now?", "..."] }
```

---

## Reports

### `GET /reports/daily?country=DK&zone=DK1`
### `GET /reports/weekly-savings?country=DK&zone=DK1`
```json
{ "report_type": "daily", "country": "DK", "zone": "DK1",
  "title": "Daily Energy Market Report — DK1 — 2026-07-06",
  "markdown": "# Daily Energy Market Report ...",
  "sections": [ { "title": "Market summary", "body": "..." } ],
  "generated_at_utc": "..." }
```
`markdown` is a ready-to-save document; `sections` is the same content
structured for the UI.

---

## Derivatives

### `GET /derivatives/curve?country=DK&zone=DK1`
```json
{
  "country": "DK",
  "zone": "DK1",
  "currency": "EUR",
  "unit": "MWh",
  "data_source": "ingested_market_prices",
  "contracts": [
    {
      "tenor": "M+1",
      "forward_eur_mwh": 82.4,
      "previous_eur_mwh": 80.9,
      "volatility": 0.31,
      "open_interest_mw": 420,
      "mark_move_eur_mwh": 1.5
    }
  ]
}
```

---

## Gas & Carbon

### `GET /gas-carbon/spark-spread?country=DK&zone=DK1`
Optional query params: `efficiency`, `emissions_t_mwh`.
```json
{
  "country": "DK",
  "zone": "DK1",
  "data_source": "ingested_market_marks",
  "efficiency": 0.52,
  "emissions_t_mwh": 0.37,
  "points": [
    {
      "label": "Mon",
      "gas_eur_mwh": 31.4,
      "carbon_eur_t": 68.2,
      "power_eur_mwh": 86.5,
      "clean_cost_eur_mwh": 85.6,
      "clean_spark_eur_mwh": 0.9
    }
  ]
}
```

---

## Internal Market Events

### `GET /market-events/history?country=DE&zone=DE-LU`
Returns curated historical energy-market shocks for the requested scope.
These endpoints are retained as backend support contracts for future risk and
advisor features. They are not currently primary frontend modules.

```json
{
  "country": "DE",
  "zone": "DE-LU",
  "events": [
    {
      "id": "eu-gas-supply-shock-2022",
      "name": "European Gas Supply Shock",
      "event_type": "war",
      "severity": "severe",
      "commodities": ["power", "gas", "carbon"],
      "market_impact": ["Gas and power forward risk premia widened sharply."],
      "playbook": ["Switch automated recommendations to manual approval mode."],
      "impact_metrics": {
        "peak_price_change_pct": 420,
        "volatility_change_pct": 260,
        "spread_change_eur_mwh": 180,
        "duration_days": 401,
        "recovery_days": 180
      },
      "linked_asset_ids": ["de-lu-zone", "dk1-zone"],
      "timeline": [
        { "phase": "trigger", "date": "2022-02-24", "description": "Geopolitical shock raised European fuel-security risk." }
      ],
      "scenario_templates": [
        { "id": "gas_spike", "label": "Gas supply shock", "description": "Raise gas marks and power scarcity premium.", "severity": "severe" }
      ],
      "confidence_labels": [
        { "claim": "Event timing and affected regions", "confidence": "confirmed", "basis": "Curated historical record." }
      ]
    }
  ]
}
```

### `GET /market-events/shock-analysis?country=DE&zone=DE-LU`
Compares the selected market against curated historical analogues and returns
operator playbook actions. This endpoint is deterministic and does not ingest
live news.

```json
{
  "country": "DE",
  "zone": "DE-LU",
  "shock_level": "severe",
  "primary_driver": "European Gas Supply Shock: Gas and power forward risk premia widened sharply.",
  "risk_drivers": ["gas_spike", "forward_premium", "power_volatility"],
  "recommended_actions": ["Switch automated recommendations to manual approval mode."],
  "analogues": [
    {
      "similarity_score": 0.99,
      "matched_signals": ["country:DE", "zone:DE-LU"]
    }
  ]
}
```

### `GET /market-events/watchlist?country=DE&zone=DE-LU`
Returns structured watch signals derived from historical analogues plus guidance
for browser-local operator notes.

```json
{
  "country": "DE",
  "zone": "DE-LU",
  "signals": [
    {
      "id": "gas_spike",
      "label": "Gas Spike",
      "severity": "severe",
      "description": "Monitor gas spike because it appeared in European Gas Supply Shock.",
      "related_event_ids": ["eu-gas-supply-shock-2022"],
      "scenario_template_ids": ["gas_spike"]
    }
  ],
  "operator_note_guidance": {
    "storage": "local_browser",
    "max_length": 600,
    "fields": ["event_id", "note", "created_at_utc"]
  }
}
```

---

## GIS & Infrastructure

### `GET /gis/assets?region=global&asset_type=all`
```json
{
  "region": "global",
  "data_source": "curated_global_fleet",
  "assets": [
    { "id": "de-lu-zone", "name": "DE-LU Market Zone", "type": "market_zone", "lon": 10.4515, "lat": 51.1657 },
    { "id": "ercot-houston", "name": "Houston Load and Thermal Hub", "type": "power_plant", "lon": -95.37, "lat": 29.76 },
    { "id": "jp-futtsu", "name": "Futtsu LNG Thermal Power Station", "type": "power_plant", "lon": 139.82, "lat": 35.31 }
  ],
  "links": [
    { "id": "ercot-west-houston", "from_asset_id": "ercot-west-wind", "to_asset_id": "ercot-houston", "capacity_mw": 6200 }
  ]
}
```

Use `region=europe`, `region=north_america`, or `region=asia` for regional
views. Use `country=DE`, `country=US`, or `country=JP` to isolate Germany,
Texas/ERCOT, or Japan/Tokyo assets.

### `GET /infrastructure/summary`
```json
{
  "region": "global",
  "asset_count": 50,
  "corridor_count": 10,
  "countries": ["DE", "DK", "JP", "US"],
  "capacity_by_fuel_mw": { "nuclear": 44500, "wind": 4750 },
  "data_source": "infrastructure_database"
}
```

---

## Errors

Validation errors return `422` with FastAPI's standard error body. Database
connectivity issues return a structured `503` error envelope with a repair hint.
The frontend `apiGet`/`apiPost` throw on non-2xx and each page renders the
error string inline.
