# Cloud Architecture

## Topology

```
        Users
          │  https
          ▼
   ┌──────────────┐        ┌───────────────────┐
   │   Vercel     │  API   │  Railway / Render  │
   │  (Next.js)   │ ─────► │   (FastAPI)        │
   └──────────────┘        └─────────┬─────────┘
                                     │ SQL
                                     ▼
                            ┌──────────────────┐
                            │  Neon / Supabase  │
                            │   (PostgreSQL)    │
                            └─────────▲────────┘
                                      │ writes
                          ┌───────────┴───────────┐
                          │  GitHub Actions (cron) │
                          │  pipelines/ jobs       │
                          └───────────┬───────────┘
                                      │ optional raw JSON
                                      ▼
                            ┌──────────────────┐
                            │  Cloudflare R2    │
                            └──────────────────┘
```

## Components

| Component | Primary | Alternative | Folder |
|---|---|---|---|
| Frontend hosting | Vercel | Netlify, Cloudflare Pages | `frontend/`, `cloud/vercel/` |
| Backend API | Railway | Render, Fly.io | `backend/`, `cloud/railway/` |
| Database | Supabase | Neon | `cloud/supabase/`, `cloud/neon/` |
| Scheduled ingestion | GitHub Actions | Railway Cron, Prefect | `pipelines/jobs/`, `cloud/prefect/` |
| Raw storage | Cloudflare R2 | Supabase Storage | `cloud/cloudflare-r2/` |
| Monitoring | Sentry + Better Stack | platform logs | — |
| AI Advisor (optional) | OpenAI API | local LLM / rule-based (default) | `backend/app/services/advisor_service.py` |

## Environment variables by surface

**Backend** (Railway/Render):
`DATABASE_URL`, `BACKEND_CORS_ORIGINS`, `ENERGI_DATA_SERVICE_BASE_URL`,
`OPEN_METEO_BASE_URL`, `ENTSOE_API_KEY?`, `DMI_API_KEY?`, `OPENAI_API_KEY?`.

**Frontend** (Vercel): `NEXT_PUBLIC_API_BASE_URL`.

**GitHub Actions** (secrets): `DATABASE_URL`, plus source base URLs/keys.

## Scaling notes

- The API is stateless; scale horizontally behind the platform's load balancer.
- Analytics are computed per request from at most a few hundred rows per zone,
  so they are cheap. If traffic grows, add a short-TTL cache (e.g. 60s) in front
  of `/forecast`, `/screener`, `/simulator`.
- The database is the only stateful component. Neon/Supabase free tiers are
  sufficient for the MVP; upgrade for retention beyond a few million rows.

## Cost posture

The entire recommended stack runs on free tiers for a demo/MVP. The only
metered external cost is the optional OpenAI Advisor — and the default advisor
is rule-based and free, so no API key is required to ship.
