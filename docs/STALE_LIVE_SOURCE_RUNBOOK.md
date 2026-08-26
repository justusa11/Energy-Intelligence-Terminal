# Stale Live Source Runbook

Use this when the UI shows:

- `Live source stale`
- `Price data freshness` is `WARN`
- `Weather data freshness` is `WARN`
- Power Prices uses fallback curves even though the backend is online
- Derivatives analytics looks wrong or uses old market data

This is a local practice runbook. It is meant for Docker/local development, GitHub portfolio demos, and LinkedIn screenshots. It is not a production incident process.

---

## What It Means

The backend can be online while the data is old.

`Live source stale` means:

1. The frontend reached the backend.
2. The backend reached the database.
3. The latest stored market/weather timestamp is older than the freshness window.
4. The app uses a deterministic fallback curve so the page still works.

This is expected if you have not run ingestion recently.

For example, if today is `2026-08-26` but the latest DK1 price row is `2026-08-21`, the app is connected but stale.

---

## Fast Fix For Docker

Run these from the project root:

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/energy_terminal'
backend\.venv\Scripts\python.exe pipelines\jobs\ingest_market_prices.py
docker compose exec -T backend python pipelines/jobs/ingest_weather.py
docker compose exec -T backend python pipelines/jobs/write_system_heartbeat.py
```

Then refresh the browser.

If the frontend was rebuilt or source files changed, restart Docker:

```powershell
docker compose up --build -d
```

---

## Verify The Fix

Check data quality:

```powershell
curl.exe -s "http://localhost:8000/api/v1/risk/data-quality?country=DK&zone=DK1"
```

Expected result:

- top-level `status` should be `OK`
- `Price coverage` should be `OK`
- `Price freshness` should be `OK`
- `Weather coverage` should be `OK`
- `Weather freshness` should be `OK`

Check ingestion status:

```powershell
curl.exe -s "http://localhost:8000/api/v1/health/ingestion-status?country=DK&zone=DK1"
```

Expected required jobs:

- `price_ingestion`: `success`
- `weather_ingestion`: `success`
- `system_heartbeat`: `success`

Optional jobs may still be pending:

- `plant_registry`
- `external_market_ingestion`

Those are enrichment jobs and are not required for the Denmark practice flow.

Check Power Prices:

```powershell
curl.exe -s "http://localhost:8000/api/v1/prices/day-ahead?country=DK&zone=DK1"
```

Expected:

```json
"data_source": "database"
```

Check Forecast:

```powershell
curl.exe -s "http://localhost:8000/api/v1/forecast/day-ahead?country=DK&zone=DK1"
```

Expected:

```json
"data_source": "database"
```

Check Derivatives:

```powershell
curl.exe -s "http://localhost:8000/api/v1/derivatives/curve?country=DK&zone=DK1"
```

Expected:

```json
"data_source": "ingested_market_prices"
```

If derivatives says `stale_database_sample_fallback`, the derivative analytics are working correctly, but the price data is stale.

---

## Why It Happens

Docker does not automatically fetch new market data every day unless you schedule it.

Starting Docker only starts:

- Postgres
- FastAPI backend
- Next.js frontend

It does not automatically refresh:

- Denmark price rows
- weather forecasts
- heartbeat activity
- optional plant/external market jobs

So if you stop working for a few days and come back, the app may start normally but still show stale data.

---

## Daily Practice Routine

When you start working on the project:

```powershell
docker compose up -d
```

Then refresh data:

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/energy_terminal'
backend\.venv\Scripts\python.exe pipelines\jobs\ingest_market_prices.py
docker compose exec -T backend python pipelines/jobs/ingest_weather.py
docker compose exec -T backend python pipelines/jobs/write_system_heartbeat.py
```

Then verify:

```powershell
curl.exe -s "http://localhost:8000/api/v1/risk/data-quality?country=DK&zone=DK1"
```

Open:

```text
http://localhost:3000/dashboard/power-prices
http://localhost:3000/dashboard/risk
http://localhost:3000/dashboard/derivatives
```

---

## If Commands Fail

### Backend is not running

Symptom:

```text
No such container
```

Fix:

```powershell
docker compose up -d backend
```

### Port is already in use

Symptom:

```text
ports are not available
```

Fix:

```powershell
docker compose ps
```

Stop the duplicate process using port `3000`, `8000`, or `5432`, then rerun Docker.

### Price ingestion writes to the wrong database

Symptom:

- ingestion prints success
- UI still shows stale data

Cause:

The script wrote to a different `DATABASE_URL`.

Fix:

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/energy_terminal'
backend\.venv\Scripts\python.exe pipelines\jobs\ingest_market_prices.py
```

Then verify with:

```powershell
curl.exe -s "http://localhost:8000/api/v1/risk/data-quality?country=DK&zone=DK1"
```

### Weather ingestion fails because Open-Meteo is unavailable

The practice weather job has a fallback generator. Run:

```powershell
docker compose exec -T backend python pipelines/jobs/ingest_weather.py
```

It should still create current practice weather rows.

---

## Optional GitHub Activity Setup

For a GitHub/LinkedIn practice project, you can show consistent project activity without production infrastructure.

Use:

- daily GitHub Actions workflows
- an `ingestion_logs` table
- a tiny `system_heartbeat` job
- Supabase dashboard logs/metrics

See:

```text
docs/SUPABASE_PRACTICE_ACTIVITY_SETUP.md
```

That setup proves the project has scheduled data operations, but it does not require a production deployment.

---

## Mental Model

Use this rule:

Backend online means the app can answer.

Fresh ingestion means the answer is based on current data.

If the backend is online but data is stale, run ingestion.
