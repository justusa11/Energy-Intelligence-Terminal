# Architecture

## Overview

The terminal is a three-tier application:

1. **Frontend** — Next.js 16 (App Router, React 19, Tailwind v4). Client
   components fetch JSON from the backend and render module pages.
2. **Backend** — FastAPI. A thin API layer over a set of **services** that hold
   all analytics logic. Services read stored data via **repositories** and fall
   back to a deterministic **sample generator** when the database is empty.
3. **Data** — PostgreSQL in production (SQLite for local/tests). Populated by
   **pipelines** (ingestion jobs) that pull from external APIs.

The guiding principle: **the API contract is stable and every module renders
with or without live data.** That is what makes the product demoable and
testable offline.

## Request flow

```
Browser
  │  GET /dashboard/power-prices  (Next.js renders shell)
  │  client component mounts → useApi("/prices/day-ahead?...")
  ▼
Frontend lib/api.ts  ──fetch──►  FastAPI  /api/v1/prices/day-ahead
                                     │
                                     ▼
                             api/v1/prices.py (router)
                                     │  Depends(get_db)
                                     ▼
                             services/price_data.load_price_series
                                     │
                          ┌──────────┴───────────┐
                          │ rows in DB?           │
                          │  yes → use them       │
                          │  no  → sample fallback │
                          └──────────┬───────────┘
                                     ▼
                             Pydantic response model → JSON
```

## Backend layering

| Layer | Directory | Responsibility |
|---|---|---|
| API | `app/api/v1/` | HTTP routing, query/body validation, dependency injection. No business logic. |
| Schemas | `app/schemas/` | Pydantic request/response contracts (the API's public shape). |
| Services | `app/services/` | All analytics: forecasting, screening, optimization, risk, simulation, advisor, reports. |
| Repositories | `app/repositories/` | SQLAlchemy queries. The only place that talks to the DB. |
| Models | `app/models/` | ORM table definitions. |
| Core | `app/core/` | Settings (`config.py`) and the country/zone registry (`countries.py`). |

### Key service modules

- **`price_data.py`** — the shared spine. `load_price_series()` returns a
  `PriceSeries` from the DB, or a deterministic synthetic series when empty.
  Every other analytics module consumes this, so they all behave consistently.
- **`forecast_service.py`** — feature engineering (calendar harmonics + lag-24 /
  lag-168 / rolling-24), a pure-Python ridge regression, a seasonal-naive
  fallback, and a holdout backtest producing MAE/RMSE. Also
  `classify_regime()` → normal / surplus / scarcity / volatile.
- **`screener_service.py`** — cheapest/most-expensive hours, spike and
  negative-price risk, actionable opportunities.
- **`flexibility_service.py`** — greedy price-ranked schedule for battery, EV,
  and shiftable load; estimated savings vs flat consumption.
- **`risk_service.py`** — the SAFE/WARN/CRITICAL gate from data freshness,
  coverage, and forecast confidence.
- **`simulator_service.py`** — day-by-day backtest of storage strategies.
- **`advisor_service.py`** — rule-based question answering composed from the
  services above (no external LLM required; swappable).
- **`report_service.py`** — daily and weekly reports rendered to markdown.

## Frontend structure

- `app/dashboard/<module>/page.tsx` — one client component per module.
- `hooks/useApi.ts` — generic `GET` hook (loading/error/data), re-fetches on
  path change. Module-specific hooks (`usePowerPrices`, `useMarketOverview`,
  `useRiskStatus`, `useDataQuality`) wrap it for the cockpit.
- `lib/api.ts` — `apiGet` / `apiPost`, base URL from `NEXT_PUBLIC_API_BASE_URL`.
- `components/ZoneSelect.tsx` — country/zone switcher shared by every page.
- `types/terminal.ts` — TypeScript mirrors of the backend Pydantic schemas.

## Data model

Three tables (see [database_schema.md](database_schema.md)):

- `market_prices` — hourly prices, unique on
  `(country_code, market, zone, source, timestamp_utc)`.
- `weather_forecasts` — hourly weather, unique on
  `(country_code, zone, source, target_time_utc)`.
- `ingestion_logs` — per-run ingestion audit.

The unique constraints make ingestion **idempotent** (re-runs skip duplicates)
and let live and sample data coexist (they differ by `source`).

## Design decisions

- **No numpy/sklearn in the API.** The forecasting math is small and
  implemented in pure Python (ridge via normal equations). This keeps the
  backend image slim and dependency-light. Heavier ML can live in `ml/` later.
- **Sample fallback over empty states.** Rather than show "no data", modules
  render a deterministic synthetic curve labeled `data_source: "sample"`. This
  is honest (the field is exposed in every payload) and keeps demos alive.
- **Services independent of transport.** Services take a `Session` and plain
  args, never `Request`. They are unit-testable and reusable across endpoints
  (the advisor and reports call other services directly).

## Multi-country

Countries and zones are declared in `app/core/countries.py`. Each zone has a
`data_mode` of `live` or `sample`. See
[multi_country_design.md](multi_country_design.md).
