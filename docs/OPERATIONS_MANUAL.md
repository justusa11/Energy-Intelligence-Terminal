# Operations Manual

**Start here when something breaks.** Every section is symptom → likely cause →
fix. This manual covers running, operating, and recovering the terminal locally
and in the cloud.

- [Daily operations](#daily-operations)
- [Running the stack](#running-the-stack)
- [Troubleshooting: Backend](#troubleshooting-backend)
- [Troubleshooting: Database](#troubleshooting-database)
- [Troubleshooting: Frontend](#troubleshooting-frontend)
- [Troubleshooting: Ingestion](#troubleshooting-ingestion)
- [Troubleshooting: Deployment](#troubleshooting-deployment)
- [Recovery procedures](#recovery-procedures)
- [Health checks & smoke test](#health-checks--smoke-test)

For the recurring `Live source stale` / stale price and weather issue, use the
focused runbook: [Stale Live Source Runbook](STALE_LIVE_SOURCE_RUNBOOK.md).

---

## Daily operations

| Task | Command |
|---|---|
| Start backend | `cd backend && uvicorn app.main:app --reload --port 8000` |
| Start frontend | `cd frontend && npm run dev` |
| Ingest DK prices | `python pipelines/jobs/ingest_market_prices.py` |
| Check external price adapters | `python pipelines/jobs/ingest_external_market_prices.py --country DE` |
| Ingest weather | `python pipelines/jobs/ingest_weather.py` |
| Seed sample data | `cd backend && python -m scripts.seed_sample_data --days 14` |
| Run tests | `cd backend && pytest` · `cd frontend && npm run lint && npm run typecheck && npm run build && npm run test:e2e` |
| Run migrations | `cd backend && python -m alembic upgrade head` |

The app is designed to **never hard-fail on missing data** — analytics fall back
to sample data. So "empty charts" is usually a connection problem, not a data
problem (see below).

---

## Running the stack

**Two processes** must run: the FastAPI backend (port 8000) and the Next.js
frontend (port 3000). The frontend calls the backend at
`NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000/api/v1`).

**Database:** set `DATABASE_URL`. For a zero-dependency local run use SQLite:
`sqlite:///./local.db`. For Postgres, use the full URL. Tables are managed by
Alembic: `python -m alembic upgrade head`. The protected
`POST /api/v1/health/init-db` endpoint is a local repair tool, not the normal
production startup path. Tests create tables automatically.

**API auth:** leave `APP_AUTH_TOKEN` empty for local demo mode. In production,
set it and call protected API routes with `Authorization: Bearer
$APP_AUTH_TOKEN`. If the Next.js frontend is proxying `/api/v1`, set its
server-only `BACKEND_API_TOKEN` to the same value. Health and docs routes remain
open for uptime checks.

---

## Troubleshooting: Backend

| Symptom | Likely cause | Fix |
|---|---|---|
| `uvicorn: command not found` | venv not activated | Activate `.venv` (`.venv\Scripts\activate` / `source .venv/bin/activate`) or call `python -m uvicorn ...`. |
| `ModuleNotFoundError: app` | Wrong working directory | Run uvicorn from inside `backend/` so `app` is importable. |
| `pydantic ... validation error ... database_url field required` | No `DATABASE_URL` and no `.env` | Set `DATABASE_URL` env var or create `backend/.env` from `.env.example`. |
| `ModuleNotFoundError: psycopg2` | Deps not installed | `pip install -r requirements.txt`. |
| 500 on every endpoint | DB unreachable (see [Database](#troubleshooting-database)) | Fix `DATABASE_URL`; try SQLite to isolate. |
| 401 on API routes | `APP_AUTH_TOKEN` is set but request has no bearer token | Add `Authorization: Bearer $APP_AUTH_TOKEN`, or unset `APP_AUTH_TOKEN` for local demo mode. |
| Port 8000 in use | Another process bound | Kill it, or run on another port and update `NEXT_PUBLIC_API_BASE_URL`. |
| Changes not taking effect | Server started without `--reload` | Restart uvicorn, or run with `--reload` in dev. |

**Isolation trick:** if unsure whether the problem is code or database, run the
backend against SQLite — `DATABASE_URL=sqlite:///./local.db`. If it works there,
the issue is your Postgres connection.

---

## Troubleshooting: Database

| Symptom | Likely cause | Fix |
|---|---|---|
| `could not translate host name` / `connection refused` | Wrong host/port or DB not running | Verify `DATABASE_URL`; start Postgres (`docker compose up db`). |
| `password authentication failed` | Wrong/unescaped password | URL-encode special chars in the password (`!`→`%21`, `#`→`%23`). |
| `relation "market_prices" does not exist` | Migrations not applied | Run `cd backend && python -m alembic upgrade head`. For local repair only, call `POST /api/v1/health/init-db` with the `x-admin-token` header. |
| `SSL connection required` (Neon/Supabase) | Missing SSL param | Append `?sslmode=require` to `DATABASE_URL`. |
| Duplicate-key errors on ingestion | Expected — idempotency | These are caught and counted as "skipped"; not an error. |
| Slow queries as data grows | Missing retention policy | Prune old rows or add TimescaleDB; indexes already exist on the query columns. |

---

## Troubleshooting: Frontend

| Symptom | Likely cause | Fix |
|---|---|---|
| Every card shows "Loading..." forever | Backend down or wrong API URL | Confirm backend health; check `NEXT_PUBLIC_API_BASE_URL` in `.env.local`. |
| Console: `API request failed: 0` / CORS error | `BACKEND_CORS_ORIGINS` doesn't match frontend origin | Set it to the exact origin (no trailing slash) and restart backend. |
| Blank/empty price chart but no error | DB has no prices for that zone | Ingest or seed data; or switch to a sample zone. `data_source` will read `sample`. |
| `npm run dev` fails to start | Deps not installed / Node too old | `npm install`; use Node 20+. |
| Type errors on `npm run build` | Backend schema changed, TS types stale | Update `types/terminal.ts` to match the Pydantic schema. |
| Env var change ignored | Next caches env at build | Restart `npm run dev`; for `NEXT_PUBLIC_*`, a restart is required. |
| Styles missing | Tailwind/PostCSS misconfig | Ensure only `postcss.config.mjs` exists (not a duplicate `.js`). |

---

## Troubleshooting: Ingestion

| Symptom | Likely cause | Fix |
|---|---|---|
| Job exits with HTTP error | Source API down or rate-limited | Retry later; the fetch window is bulk, not per-hour, so occasional failures are safe to re-run. |
| `rows_inserted: 0, rows_skipped: N` | Data already present | Normal on re-runs (idempotent). Not an error. |
| `rows_failed > 0` | Malformed record / normalizer mismatch | Check the printed record; adjust the normalizer in `pipelines/normalizers/`. |
| Weather job stores nulls | Provider returned partial fields | Expected; null columns are allowed and the data-quality check flags coverage. |
| Prices look stale in UI | Job not scheduled | Run manually, or set up the GitHub Actions workflow ([deployment.md](deployment.md)). Price freshness warns after 72h, fails after 168h. |
| External market stays sample | Provider credential or endpoint missing | Check `/api/v1/health/ingestion-status`; set `ENTSOE_API_KEY`, `ERCOT_API_SUBSCRIPTION_KEY`, or `JEPX_BASE_URL` as needed. |

**Manual ingest, then verify:**
```bash
python pipelines/jobs/ingest_market_prices.py   # prints {rows_fetched, rows_inserted, ...}
curl "http://localhost:8000/api/v1/prices/day-ahead?zone=DK1"
```

---

## Troubleshooting: Deployment

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend loads, all data fails | `NEXT_PUBLIC_API_BASE_URL` points at localhost | Set it to the deployed backend URL and redeploy. |
| CORS errors in production | `BACKEND_CORS_ORIGINS` missing the Vercel URL | Add the exact Vercel origin; redeploy backend. |
| Backend build fails on host | Missing system libs for psycopg2 | Use the provided `backend/Dockerfile` (installs `libpq-dev`). |
| Backend boots but 500s | `DATABASE_URL` not set / wrong | Set the platform secret; confirm with `/api/v1/health` then a data endpoint. |
| Protected endpoints return 401 | `APP_AUTH_TOKEN` set in backend but frontend/proxy/client does not send it | Set frontend `BACKEND_API_TOKEN` to the same value, or leave token auth off until real identity-provider auth is wired. |
| Scheduled ingestion not running | Workflow/secret missing | Add `.github/workflows/ingest.yml` and the `DATABASE_URL` secret. |
| Rollback needed | Bad deploy | Redeploy the previous Git SHA (Vercel/Railway keep history). DB is additive; no data rollback needed. |

---

## Recovery procedures

**Reset local database (SQLite):** delete the `.db` file and run
`python -m alembic upgrade head`.

**Recreate tables (Postgres):** back up first if the data matters, then drop the
local schema/database and run `python -m alembic upgrade head`.

**Rebuild sample data:**
```bash
cd backend
python -m scripts.seed_sample_data --days 14 --include-dk
```

**Full local reset:**
```bash
# backend
rm backend/*.db
cd backend && python -m alembic upgrade head
# frontend
rm -rf frontend/.next && (cd frontend && npm install)
```

**Corrupted frontend build:** `rm -rf frontend/.next` then rebuild.

---

## Health checks & smoke test

Run this after any deploy or major change. All should print `200`:

```bash
BASE=http://localhost:8000/api/v1   # or your deployed URL
AUTH_HEADER=                       # set to: -H "Authorization: Bearer $APP_AUTH_TOKEN"
for ep in health market/overview market/countries prices/day-ahead \
          health/observability health/ingestion-status \
          forecast/day-ahead weather/forecast screener/opportunities \
          flexibility/schedule "simulator/backtest?days=7" \
          risk/status risk/data-quality reports/daily reports/weekly-savings; do
  printf "%s  %s\n" "$(curl -s -o /dev/null -w '%{http_code}' $AUTH_HEADER "$BASE/$ep")" "$ep"
done

# Advisor (POST):
curl -s -X POST "$BASE/advisor/ask" $AUTH_HEADER -H "Content-Type: application/json" \
  -d '{"question":"When is electricity cheapest today?","country":"DK","zone":"DK1"}'
```

If every GET returns 200 and the advisor returns an `answer`, the system is
healthy. If a specific module fails, jump to the matching section above.

**Frontend button smoke test:**
```bash
cd frontend
npm run build
npm run test:e2e
```
The E2E runner starts the built Next.js app on port 3100, clicks representative
topbar and infrastructure-map controls, then shuts the test server down.

---

## Who to check first (triage order)

1. Is the **backend** up? `curl $BASE/health`.
2. Is the **database** reachable? Try a data endpoint; if 500, it's the DB.
3. Is the **frontend env** correct? `NEXT_PUBLIC_API_BASE_URL`.
4. Is it a **CORS** mismatch? Check the browser console.
5. Only then suspect **data** — and remember analytics fall back to sample, so
   truly-empty output almost always means a connection problem, not missing data.
