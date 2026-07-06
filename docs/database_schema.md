# Database Schema

Engine: PostgreSQL in production, SQLite locally and in tests. Tables are
created by `app/db/init_db.py` (`Base.metadata.create_all`). There are no
Alembic migrations yet; the schema is small and created idempotently on
startup. When the schema changes in production, either recreate or introduce
Alembic (dependency already present).

## `market_prices`

Hourly market prices (day-ahead today; the `market` column allows more later).

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `country_code` | varchar(10) | indexed, e.g. `DK` |
| `market` | varchar(50) | indexed, e.g. `day_ahead` |
| `zone` | varchar(50) | indexed, e.g. `DK1` |
| `source` | varchar(100) | indexed, e.g. `energidataservice`, `sample` |
| `timestamp_utc` | timestamptz | indexed; the delivery hour in UTC |
| `local_timestamp` | timestamp | nullable; local wall-clock time |
| `price` | float | price in `currency`/`unit` |
| `currency` | varchar(10) | default `EUR` |
| `unit` | varchar(20) | default `MWh` |
| `created_at` | timestamptz | insert time |

**Unique constraint** `uq_market_price_unique_timestamp` on
`(country_code, market, zone, source, timestamp_utc)` — makes ingestion
idempotent and lets `source="sample"` coexist with live rows.

## `weather_forecasts`

Hourly weather forecast points per zone.

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `country_code` | varchar(10) | indexed |
| `zone` | varchar(50) | indexed |
| `source` | varchar(100) | indexed, e.g. `open_meteo` |
| `latitude` / `longitude` | float | forecast point |
| `forecast_issue_time_utc` | timestamptz | nullable; when the forecast was issued |
| `target_time_utc` | timestamptz | indexed; the hour the values describe |
| `temperature_2m_c` | float | nullable |
| `wind_speed_10m_ms` | float | nullable |
| `wind_speed_100m_ms` | float | nullable |
| `shortwave_radiation_wm2` | float | nullable |
| `precipitation_mm` | float | nullable |
| `created_at` | timestamptz | insert time |

**Unique constraint** `uq_weather_forecast_unique_target_time` on
`(country_code, zone, source, target_time_utc)`.

## `ingestion_logs`

Audit record for each ingestion run.

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `source` | varchar(100) | indexed |
| `dataset` | varchar(100) | indexed |
| `status` | varchar(50) | indexed, e.g. `success`, `failed` |
| `rows_fetched` | int | |
| `rows_inserted` | int | |
| `message` | text | nullable; error detail |
| `started_at` | timestamptz | |
| `finished_at` | timestamptz | nullable |

## Relationships

The tables are intentionally flat and denormalized by `(country_code, zone,
source)`. Analytics join nothing at the DB level — a query pulls one zone's
recent rows and the service does the rest in Python. This keeps queries trivial
and portable between Postgres and SQLite.

## Time handling

All analytical timestamps are stored in UTC (`timestamp_utc` /
`target_time_utc`). Normalization to UTC happens in the pipeline normalizers
before insert. `local_timestamp` is kept for display/debugging only.
