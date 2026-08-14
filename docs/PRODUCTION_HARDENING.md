# Production Hardening Notes

This document records the production-readiness changes added to the Energy
Intelligence Terminal and the commands used to verify them.

## Implemented Changes

### Backend Safety

- `POST /api/v1/health/init-db` now requires `x-admin-token` matching
  `INIT_DB_ADMIN_TOKEN`.
- `GET /api/v1/health/deep` checks database reachability, Alembic migration
  status, price availability, and weather availability for the requested
  `country` and `zone`.
- `GET /api/v1/health/ingestion-status` reports provider configuration and
  repair commands for price, weather, and plant registry ingestion.
- Backend database failures return a structured JSON error envelope with a
  repair hint instead of opaque proxy failures.
- Protected API routes can require `Authorization: Bearer <APP_AUTH_TOKEN>`;
  health/docs remain open for uptime checks and local demo mode stays open when
  `APP_AUTH_TOKEN` is empty.
- `GET /api/v1/health/observability` reports request-ID support, auth mode,
  CORS origins, and provider environment readiness.
- Every backend response receives an `x-request-id` header for log correlation.
- Alembic is configured under `backend/migrations` with an initial migration for
  `market_prices`, `weather_forecasts`, and `ingestion_logs`.
- Empty API modules are now real contracts:
  - `GET /api/v1/derivatives/curve`
  - `GET /api/v1/gas-carbon/spark-spread`
  - `GET /api/v1/gis/assets`
  - `GET /api/v1/infrastructure/summary`
- Derivatives now use ingested price records when available.
- Gas and carbon spark spreads now use ingested market marks when available.
- Internal market-event endpoints provide curated historical shock analogues,
  impact metrics, linked infrastructure assets, event timelines, scenario
  templates, confidence labels, watchlist signals, and deterministic operator
  playbooks without storing full news articles.
- `GET /api/v1/context/market-context` combines weather, seasonality,
  curated event memory, infrastructure exposure, and price behavior into one
  explainable market context score for future advisor/risk support.
- Curated infrastructure records are stored in backend tables for Europe,
  Germany/DE-LU, ERCOT/Texas, and Japan/Tokyo. Regional GIS queries still work,
  while `region=global` powers the global map.
- Additional European plant records can be populated through
  `backend/pipelines/jobs/ingest_european_power_plants.py`.

### Frontend Reliability

- Shared API requests now support timeout, retry, and abort behavior.
- Repeated data hooks now use the shared `useApi` hook.
- Market Cockpit risk checks are scoped by the selected country and zone.
- Market Cockpit includes a decision brief for trust, opportunity, risk, and
  recommended action, now presented as a status → driver → action → risk gate →
  expected value workflow.
- Data truth badges distinguish live-capable, live, sample, pending, failed, and
  fallback data states across the terminal.
- Hourly price charts can export the displayed series as CSV.
- Speculative Market Events and Market Context frontend surfaces were removed
  from the active product path. The first production pass now focuses on core
  terminal workflows: Power Prices, Weather, Gas & Carbon, Infrastructure,
  Flexibility, Simulator, Risk, AI Advisor, and Reports.
- Topbar and map controls have stable accessible labels for users and E2E tests.
- Frontend dependencies were audited and upgraded to remove known npm
  vulnerabilities reported by `npm audit`.

### CI And Scheduled Jobs

- `.github/workflows/ci.yml` runs backend contracts, frontend lint, typecheck,
  build, and Playwright smoke tests.
- `.github/workflows/ingest-prices.yml` runs scheduled/manual price ingestion.
- `.github/workflows/ingest-weather.yml` runs scheduled/manual weather ingestion.
- Scheduled ingestion requires the GitHub secret `DATABASE_URL`.

### E2E Smoke Tests

- `frontend/e2e/dashboard-controls.spec.ts` verifies representative topbar and
  infrastructure-map controls.
- `frontend/scripts/run-e2e.mjs` starts the built Next.js app on port `3100`,
  runs Playwright, then stops the test server cleanly on Windows.

## Required Environment Variables

```bash
DATABASE_URL=postgresql://...
BACKEND_CORS_ORIGINS=http://localhost:3000
INIT_DB_ADMIN_TOKEN=change-me-for-local-admin-actions
APP_AUTH_TOKEN=
NEXT_PUBLIC_API_BASE_URL=/api/v1
BACKEND_API_ORIGIN=http://localhost:8000
BACKEND_API_TOKEN=
ENTSOE_API_KEY=
ERCOT_API_SUBSCRIPTION_KEY=
ERCOT_DAM_SPP_ENDPOINT=
JEPX_BASE_URL=
```

## Verification Commands

Run these before deployment:

```bash
python -m pytest backend\tests\test_api_contract.py
cd backend
python -m alembic upgrade head
cd frontend
npm audit --audit-level=moderate
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

## Health Check Commands

```bash
curl http://localhost:8000/api/v1/health
curl "http://localhost:8000/api/v1/health/deep?country=DK&zone=DK1"
curl "http://localhost:8000/api/v1/health/ingestion-status?country=DK&zone=DK1"
curl "http://localhost:8000/api/v1/health/observability"
curl "http://localhost:8000/api/v1/market-events/history?country=DE&zone=DE-LU"
curl "http://localhost:8000/api/v1/market-events/shock-analysis?country=US&zone=ERCOT"
curl "http://localhost:8000/api/v1/market-events/watchlist?country=JP&zone=JP-TK"
curl "http://localhost:8000/api/v1/context/market-context?country=DK&zone=DK1"
curl "http://localhost:8000/api/v1/gis/assets?region=global&asset_type=all"
curl "http://localhost:8000/api/v1/gis/assets?region=global&country=US&asset_type=all"
```

Protected database initialization:

```bash
curl -X POST http://localhost:8000/api/v1/health/init-db ^
  -H "x-admin-token: %INIT_DB_ADMIN_TOKEN%"
```

## GitHub Setup

Add these repository secrets before enabling scheduled ingestion:

```text
DATABASE_URL
ENTSOE_API_KEY
ERCOT_API_SUBSCRIPTION_KEY
JEPX_BASE_URL
```

Optional deployment environments should also set:

```text
BACKEND_CORS_ORIGINS
INIT_DB_ADMIN_TOKEN
APP_AUTH_TOKEN
NEXT_PUBLIC_API_BASE_URL
BACKEND_API_ORIGIN
BACKEND_API_TOKEN
```

## Remaining Production Work

- Connect scheduled fuel/carbon mark ingestion to a licensed provider.
- Replace the bearer-token gate with real identity-provider auth before adding
  real users, customer assets, or admin job-trigger actions.
- Keep market-event/context intelligence internal until it is validated against
  real operator workflows and folded into Power Prices, Risk, and AI Advisor.
- Import a full OPSD/powerplantmatching/EIA/OCCTO-style plant registry for
  production completeness beyond the included curated global seed.
- Add a new Alembic revision for every future schema change before deployment.
- Add provider-specific request logging/metrics once a deployment target is
  chosen.
