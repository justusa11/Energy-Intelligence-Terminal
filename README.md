# AI Energy Intelligence Terminal

A multi-country energy-market intelligence terminal: day-ahead price analytics,
baseline price forecasting, market-regime classification, a market screener, a
flexibility optimizer, a storage trading simulator, a data-driven AI advisor,
automated reports, and an infrastructure map — all behind a Next.js dashboard
served by a FastAPI backend.

> **Status:** Product MVP. Denmark (DK1/DK2) runs on **live** data from Energi
> Data Service and Open-Meteo. Germany, US (ERCOT) and Japan (JEPX) run on
> **sample** data until their adapters are connected. Every analytics module
> works today thanks to a deterministic sample-data fallback, so the terminal
> is fully demoable with an empty database.

---

## Table of contents

- [Architecture at a glance](#architecture-at-a-glance)
- [Quick start (local)](#quick-start-local)
- [Project layout](#project-layout)
- [Modules](#modules)
- [API summary](#api-summary)
- [Data sources](#data-sources)
- [Documentation index](#documentation-index)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Architecture at a glance

```
┌────────────────────┐     HTTP/JSON      ┌──────────────────────┐
│  Next.js frontend  │  ───────────────►  │   FastAPI backend    │
│  (dashboard, 12    │  ◄───────────────  │   /api/v1/*          │
│   module pages)    │                    │                      │
└────────────────────┘                    │  services/           │
                                          │   forecast, screener,│
                                          │   flexibility, risk, │
                                          │   simulator, advisor,│
                                          │   reports            │
                                          └──────────┬───────────┘
                                                     │ SQLAlchemy
                                                     ▼
                                          ┌──────────────────────┐
                                          │  PostgreSQL / SQLite  │
                                          │  market_prices,       │
                                          │  weather_forecasts,   │
                                          │  ingestion_logs       │
                                          └──────────▲───────────┘
                                                     │ writes
                                          ┌──────────┴───────────┐
                                          │  pipelines/ jobs      │
                                          │  Energi Data Service, │
                                          │  Open-Meteo           │
                                          └──────────────────────┘
```

Full detail: [docs/architecture.md](docs/architecture.md).

---

## Quick start (local)

Prerequisites: **Python 3.11+**, **Node.js 20+**, and (optionally) PostgreSQL.
Without PostgreSQL you can run entirely on SQLite.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

# Point at a database. For a zero-setup local run, use SQLite:
#   PowerShell:  $env:DATABASE_URL="sqlite:///./local.db"
#   bash:        export DATABASE_URL="sqlite:///./local.db"
# Or copy .env.example to .env and edit DATABASE_URL for PostgreSQL.
cp .env.example .env

# Create tables:
python -c "from app.db.init_db import init_db; init_db()"

# (optional) seed sample prices for DE/US/JP zones:
python -m scripts.seed_sample_data --days 14

# Run the API:
uvicorn app.main:app --reload --port 8000
```

API docs live at http://localhost:8000/docs.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
npm run dev
```

Open http://localhost:3000 → you land on the login page, then the dashboard.

### 3. (optional) Ingest live Denmark data

```bash
cd backend && source .venv/bin/activate   # or the Windows equivalent
python ../pipelines/jobs/ingest_market_prices.py
python ../pipelines/jobs/ingest_weather.py
```

See the [Operations Manual](docs/OPERATIONS_MANUAL.md) if anything fails.

### One-command dev (Make)

```bash
make install     # install backend + frontend deps
make seed        # create tables + seed sample data
make dev         # run backend and frontend together
make test        # backend pytest + frontend build
```

---

## Project layout

```
energy-intelligence-terminal/
├── backend/            FastAPI app, services, models, tests
│   └── app/
│       ├── api/v1/     HTTP endpoints (one file per module)
│       ├── services/   business logic (forecast, screener, ...)
│       ├── repositories/  DB access
│       ├── models/     SQLAlchemy ORM tables
│       ├── schemas/    Pydantic request/response contracts
│       └── core/       config + country/zone registry
├── frontend/           Next.js 16 (App Router) dashboard
│   ├── app/dashboard/  one folder per module page
│   ├── components/     shared UI (ZoneSelect, cards, layout)
│   ├── hooks/          data-fetching hooks (useApi, ...)
│   ├── lib/            api client, constants, sample GIS
│   └── types/          TypeScript mirrors of backend schemas
├── pipelines/          ingestion jobs, source clients, normalizers, configs
├── cloud/              per-provider deployment notes (Vercel, Railway, ...)
├── docs/               all documentation (see index below)
├── ml/                 (reserved) model training scripts
├── docker-compose.yml  local Postgres + backend + frontend
└── Makefile            dev shortcuts
```

---

## Modules

| Module | Route | Backed by |
|---|---|---|
| Market Cockpit | `/dashboard/market-cockpit` | market overview + prices + risk |
| Power Prices | `/dashboard/power-prices` | `prices`, `forecast` |
| Weather Intelligence | `/dashboard/weather` | `weather` |
| Screener | `/dashboard/screener` | `screener` |
| Flexibility Optimizer | `/dashboard/flexibility` | `flexibility` |
| Trading Simulator | `/dashboard/simulator` | `simulator` |
| Risk Monitor | `/dashboard/risk` | `risk` |
| AI Advisor | `/dashboard/advisor` | `advisor` |
| Reports | `/dashboard/reports` | `reports` |
| Infrastructure Map | `/dashboard/infrastructure-map` | sample GIS assets |
| Gas & Carbon | `/dashboard/gas-carbon` | roadmap |
| Derivatives | `/dashboard/derivatives` | roadmap |

---

## API summary

Base URL: `http://localhost:8000/api/v1`

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/market/overview` | KPIs + regime + recommendation |
| GET | `/market/countries` | country/zone registry |
| GET | `/prices/day-ahead` | stored hourly prices |
| GET | `/forecast/day-ahead` | forecast + regime + backtest metrics |
| GET | `/weather/forecast` | stored weather |
| GET | `/screener/opportunities` | cheap/expensive hours, risk flags |
| GET | `/flexibility/schedule` | battery/EV/load schedule + savings |
| GET | `/simulator/backtest` | storage strategy P&L |
| GET | `/risk/status` | SAFE/WARN/CRITICAL gate |
| GET | `/risk/data-quality` | per-check data-quality report |
| POST | `/advisor/ask` | question → data-grounded answer |
| GET | `/advisor/suggested-questions` | starter prompts |
| GET | `/reports/daily` | daily market report (markdown) |
| GET | `/reports/weekly-savings` | weekly savings report |

Full request/response detail: [docs/api.md](docs/api.md).

---

## Data sources

| Area | Source | Access |
|---|---|---|
| Denmark power prices | [Energi Data Service](https://www.energidataservice.dk/) | Free/open |
| Weather | [Open-Meteo](https://open-meteo.com/) | Free (non-commercial) |
| Germany/Europe | [ENTSO-E](https://transparency.entsoe.eu/) | Free registration (adapter pending) |
| US / Japan | ISO/RTO & JEPX | sample data (adapters pending) |

Details: [docs/data_sources.md](docs/data_sources.md).

---

## Documentation index

| Doc | What it covers |
|---|---|
| [architecture.md](docs/architecture.md) | System design, data flow, module map |
| [api.md](docs/api.md) | Every endpoint, params, and example payloads |
| [database_schema.md](docs/database_schema.md) | Tables, columns, constraints |
| [data_sources.md](docs/data_sources.md) | External feeds and licensing |
| [deployment.md](docs/deployment.md) | Cloud deployment (Vercel + Railway + Neon/Supabase) |
| [cloud_architecture.md](docs/cloud_architecture.md) | Cloud topology and env vars |
| [multi_country_design.md](docs/multi_country_design.md) | Zone registry, live vs sample |
| [gis_architecture.md](docs/gis_architecture.md) | Infrastructure-map data model |
| [ui_design.md](docs/ui_design.md) | Layout, theming, component conventions |
| [roadmap.md](docs/roadmap.md) | 24-week plan and what's next |
| [OPERATIONS_MANUAL.md](docs/OPERATIONS_MANUAL.md) | **Run/fix guide — start here when something breaks** |
| [GO_TO_MARKET.md](docs/GO_TO_MARKET.md) | Positioning, ICP, pricing, launch plan |

---

## Testing

```bash
cd backend && pytest             # API contract tests (SQLite, no network)
cd frontend && npm run build     # type-check + production build
```

---

## Troubleshooting

The single source of truth for "it broke, now what" is the
**[Operations Manual](docs/OPERATIONS_MANUAL.md)**. It covers backend won't
start, DB connection errors, empty charts, CORS, ingestion failures, and
deployment issues, each with a symptom → cause → fix table.
