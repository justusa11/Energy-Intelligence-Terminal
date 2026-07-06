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
Stored hourly prices (empty `prices: []` if the DB has no rows for the zone —
note this endpoint does **not** use the sample fallback, so an empty DB returns
an empty list here while the analytics endpoints synthesize).
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
Weather has no sample fallback; an empty DB returns `forecasts: []`.

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

## Errors

Validation errors return `422` with FastAPI's standard error body. Database
connectivity issues surface as `500`. The frontend `apiGet`/`apiPost` throw on
non-2xx and each page renders the error string inline.
