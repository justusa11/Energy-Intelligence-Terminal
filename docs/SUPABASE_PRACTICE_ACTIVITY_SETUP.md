# Supabase Practice Activity Setup

This project is not production, so the goal is simple:

- Run small daily ingestion jobs.
- Write a tiny heartbeat row so Supabase sees real database activity.
- Make the activity visible from GitHub Actions and the app health endpoint.

## 1. Add GitHub Secret

In GitHub:

1. Open the repository.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Add a repository secret named `DATABASE_URL`.
4. Use your Supabase Postgres connection string.

Use the pooled connection string if Supabase recommends it for serverless/CI jobs.

## 2. Daily Jobs

The repository includes three scheduled workflows:

- `.github/workflows/ingest-prices.yml`
- `.github/workflows/ingest-weather.yml`
- `.github/workflows/practice-heartbeat.yml`

They can also be run manually from the GitHub Actions tab.

For practice/profile use, daily is enough. You do not need production-grade uptime monitoring.

## 3. What Gets Written

The price and weather jobs write market/weather rows and an `ingestion_logs` entry.

The heartbeat job runs:

```bash
python pipelines/jobs/write_system_heartbeat.py
```

That job performs a tiny database read and writes one `ingestion_logs` row with:

- `dataset = system_heartbeat`
- `source = github_actions_practice`
- `status = success`

## 4. Check From The App

Run the backend and open:

```text
http://localhost:8000/api/v1/health/ingestion-status?country=DK&zone=DK1
```

You should see:

- `price_ingestion`
- `weather_ingestion`
- `system_heartbeat`

Each job shows the latest run timestamp and status.

## 5. Check In Supabase

In Supabase Dashboard:

1. Open your project.
2. Go to `Table Editor`.
3. Open `ingestion_logs`.
4. Confirm new rows appear after GitHub Actions runs.

You can also check database logs/metrics in the Supabase Dashboard to confirm activity.

## 6. Local Manual Test

From the project root:

```bash
cd backend
python -m alembic upgrade head
cd ..
python pipelines/jobs/write_system_heartbeat.py
```

Then check:

```text
http://localhost:8000/api/v1/health/ingestion-status?country=DK&zone=DK1
```

## Notes

This is intentionally lightweight. For production you would add stronger monitoring, alerting, retries, and secret rotation. For a GitHub/LinkedIn portfolio project, this is enough to show scheduled ingestion, health reporting, and basic observability.
