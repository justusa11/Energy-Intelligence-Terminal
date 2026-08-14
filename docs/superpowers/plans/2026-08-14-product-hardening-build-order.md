# Product Hardening Build Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move FlexTrade AI from demo dashboard toward a trustworthy operator terminal with visible data truth, ingestion status, provider readiness, observability, better forecast confidence, clearer decisions, and deployable auth controls.

**Architecture:** Use the existing FastAPI + SQLAlchemy + Next.js architecture. Keep Denmark live-capable, keep DE/ERCOT/JP honest as sample until credentials and provider jobs are configured, and expose readiness/status instead of pretending all markets are live.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Python requests, Next.js 16, React 19, TypeScript, Playwright.

## Global Constraints

- Keep live/sample/stale/failed labels visible; do not hide sample data.
- Prefer existing hooks and page patterns over new state management.
- API errors use `{ error: { code, message, repair_hint } }`.
- Production backend can require `APP_AUTH_TOKEN`; frontend proxy forwards `BACKEND_API_TOKEN`.
- External provider adapters must fail clearly when credentials or provider setup are missing.

---

### Task 1: Ingestion Status Dashboard

**Files:**
- Modify: `frontend/app/dashboard/risk/page.tsx`
- Modify: `frontend/components/cards/DataQualityStatusCard.tsx`
- Modify: `frontend/hooks/useIngestionStatus.ts`
- Test: `frontend/e2e/dashboard-controls.spec.ts`

**Interfaces:**
- Consumes: `GET /api/v1/health/ingestion-status?country=&zone=`
- Produces: visible ingestion status, provider readiness, repair commands, and stale/pending labels.

- [ ] Add E2E assertion that Risk Monitor shows provider readiness and ingestion repair commands.
- [ ] Render provider cards for Energi Data Service, Open-Meteo, ENTSO-E, ERCOT, and JEPX where applicable.
- [ ] Render job cards with latest run, rows inserted, status, message, and repair command.
- [ ] Verify with Playwright.

### Task 2: Provider Adapter Foundations

**Files:**
- Modify: `pipelines/sources/entsoe_client.py`
- Modify: `pipelines/sources/ercot_client.py`
- Modify: `pipelines/sources/jepx_client.py`
- Create: `pipelines/jobs/ingest_external_market_prices.py`
- Modify: `pipelines/configs/countries/germany.yaml`
- Modify: `pipelines/configs/countries/united_states.yaml`
- Modify: `pipelines/configs/countries/japan.yaml`
- Test: `backend/tests/test_api_contract.py`

**Interfaces:**
- Produces: provider readiness clients with explicit `is_configured`, fetch methods, and actionable error messages.
- Produces: one CLI job that reports unsupported/unconfigured providers without crashing silently.

- [ ] Add tests for provider readiness in ingestion-status.
- [ ] Implement adapter classes matching existing `EnergiDataServiceClient` style.
- [ ] Add country config files with provider, zone, credential env var, and repair command.
- [ ] Add external ingestion job that dispatches by country.
- [ ] Verify backend contracts.

### Task 3: Observability

**Files:**
- Create: `backend/app/core/observability.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/api/v1/health.py`
- Test: `backend/tests/test_api_contract.py`

**Interfaces:**
- Produces: request ID middleware, structured access/error logs, `/health/observability`.

- [ ] Test request IDs appear in response headers.
- [ ] Add middleware that sets or forwards `x-request-id`.
- [ ] Add observability endpoint that reports environment, auth gate, CORS origins, and provider env readiness.
- [ ] Verify backend contracts.

### Task 4: Forecast Confidence Improvements

**Files:**
- Modify: `backend/app/services/forecast_service.py`
- Modify: `backend/app/schemas/forecast.py`
- Modify: `frontend/types/terminal.ts`
- Modify: `frontend/app/dashboard/power-prices/page.tsx`
- Test: `backend/tests/test_api_contract.py`

**Interfaces:**
- Produces: forecast payload with `confidence`, `drivers`, and `feature_summary`.

- [ ] Add contract assertions for confidence and drivers.
- [ ] Include time-of-day, weekday/weekend, price history, weather source, and sample/live source in confidence.
- [ ] Render forecast confidence in the Power Prices page.
- [ ] Verify backend and frontend.

### Task 5: Decision Workflow

**Files:**
- Modify: `frontend/components/DecisionBrief.tsx`
- Modify: `frontend/app/dashboard/market-cockpit/page.tsx`
- Test: `frontend/e2e/dashboard-controls.spec.ts`

**Interfaces:**
- Produces: decision sequence: status → driver → action → risk gate → expected value.

- [ ] Add E2E assertion for the decision workflow headings.
- [ ] Render concise operator workflow cards.
- [ ] Keep charts secondary to the decision.
- [ ] Verify E2E.

### Task 6: Auth Hardening

**Files:**
- Modify: `docs/OPERATIONS_MANUAL.md`
- Modify: `docs/PRODUCTION_HARDENING.md`
- Modify: `frontend/app/login/page.tsx`

**Interfaces:**
- Produces: clear distinction between local demo mode, token-gated production mode, and future identity-provider auth.

- [ ] Update login copy to avoid implying real user auth is complete.
- [ ] Add runbook commands for token-gated API checks.
- [ ] Verify frontend build.
