# Deployment

Recommended stack (all have free tiers): **Vercel** (frontend) + **Railway** or
**Render** (backend) + **Neon** or **Supabase** (Postgres) + **GitHub Actions**
(scheduled ingestion) + optional **Cloudflare R2** (raw data snapshots).

Per-provider notes live under [`cloud/`](../cloud). This file is the end-to-end
runbook.

---

## 0. Prerequisites

- Repo pushed to GitHub.
- Local `make test` green (backend pytest + frontend build).
- Decide zones to run live (Denmark by default).

## 1. Database (Neon or Supabase)

1. Create a project and a Postgres database.
2. Copy the connection string (`postgresql://user:pass@host:5432/db`).
   - Neon: use the pooled connection string for the API.
   - Supabase: Settings → Database → Connection string (URI). URL-encode special
     characters in the password.
3. You will set this as `DATABASE_URL` on the backend host.

Tables are created automatically on backend startup
(`init_db()` in `app/main` import path). No migration step needed for first
deploy.

## 2. Backend (Railway or Render)

1. New service → deploy from the `backend/` directory (Dockerfile included).
2. Environment variables:
   - `DATABASE_URL` = the Postgres URL from step 1
   - `BACKEND_CORS_ORIGINS` = your Vercel URL, e.g. `https://your-app.vercel.app`
   - `ENERGI_DATA_SERVICE_BASE_URL` = `https://api.energidataservice.dk`
   - `OPEN_METEO_BASE_URL` = `https://api.open-meteo.com`
   - `ENTSOE_API_KEY`, `DMI_API_KEY`, `OPENAI_API_KEY` — only if used
3. Start command (if not using the Dockerfile CMD):
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Confirm `GET https://<backend>/api/v1/health` returns `{"status":"ok"}`.

## 3. Frontend (Vercel)

1. Import the repo, set the **root directory** to `frontend/`.
2. Environment variable:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://<backend>/api/v1`
3. Framework preset: Next.js. Build command `npm run build` (default).
4. Deploy. Update the backend's `BACKEND_CORS_ORIGINS` to the final Vercel URL
   if it changed.

## 4. Scheduled ingestion (GitHub Actions)

Create `.github/workflows/ingest.yml` to run the pipeline jobs on a schedule.
Store `DATABASE_URL` as a repository secret.

```yaml
name: ingest
on:
  schedule:
    - cron: "15 * * * *"   # hourly at :15
  workflow_dispatch: {}
jobs:
  ingest:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      ENERGI_DATA_SERVICE_BASE_URL: https://api.energidataservice.dk
      OPEN_METEO_BASE_URL: https://api.open-meteo.com
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r backend/requirements.txt
      - run: python pipelines/jobs/ingest_market_prices.py
      - run: python pipelines/jobs/ingest_weather.py
```

`workflow_dispatch` lets you trigger a run manually from the Actions tab.

## 5. Raw snapshots (optional, Cloudflare R2)

If you want an audit trail of raw API payloads, write them to an R2 bucket from
the ingestion jobs before normalization. See
[cloud/cloudflare-r2/](../cloud/cloudflare-r2). Not required for the app to run.

## 6. Post-deploy checklist

- [ ] `GET /api/v1/health` → 200
- [ ] `GET /api/v1/market/countries` → 200 with DK/DE/US/JP
- [ ] Frontend loads and the Market Cockpit shows numbers (sample or live)
- [ ] Run the ingestion workflow once; confirm rows appear (Power Prices page
      shows a chart, `data_source` becomes `database`)
- [ ] `BACKEND_CORS_ORIGINS` exactly matches the frontend origin (no trailing slash)

## Security notes

- Never commit real credentials. `backend/.env` is gitignored; use platform
  secret stores in the cloud.
- Rotate any credential that has been committed to history before going public.
- The demo login is a placeholder — add real auth (e.g. Supabase Auth) before
  exposing anything sensitive. See [cloud/supabase/auth.md](../cloud/supabase/auth.md).

Rollback: redeploy the previous Git SHA on Vercel/Railway (both keep deploy
history). The database is additive (idempotent inserts), so app rollbacks do not
require data rollbacks.
