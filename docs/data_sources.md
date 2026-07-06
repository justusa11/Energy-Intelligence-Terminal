# Data Sources

| Data area | Source | Access | Used for | Status |
|---|---|---|---|---|
| Denmark power prices | [Energi Data Service](https://www.energidataservice.dk/) | Free/open API, no key | DK1/DK2 day-ahead prices | **Live** |
| Weather forecasts | [Open-Meteo](https://open-meteo.com/) | Free (non-commercial), no key | Temperature, wind (10m/100m), solar, precipitation | **Live** |
| Europe / Germany | [ENTSO-E Transparency](https://transparency.entsoe.eu/) | Free registration + API token | DE-LU prices, load, generation | Adapter pending |
| Danish weather (alt) | [DMI Open Data](https://www.dmi.dk/frie-data/) | Free/open API, key | Observations/forecasts | Optional |
| United States | ISO/RTO APIs (ERCOT, CAISO, PJM, …) | Varies by ISO | Regional prices | Sample data |
| Japan | [JEPX](https://www.jepx.jp/) & public sources | Check terms | Regional prices | Sample data |

## Live pipelines

### Denmark prices — `pipelines/jobs/ingest_market_prices.py`
- Client: `pipelines/sources/energidataservice_client.py`
- Normalizer: `pipelines/normalizers/price_normalizer.py`
- Fetches a rolling window (−10 days … +3 days), normalizes to UTC, and inserts
  with `create_market_price_if_not_exists` (idempotent). Stores `source` so
  re-runs and sample data never collide.
- Run: `python pipelines/jobs/ingest_market_prices.py`

### Weather — `pipelines/jobs/ingest_weather.py`
- Client: `pipelines/sources/open_meteo_client.py`
- Normalizer: `pipelines/normalizers/weather_normalizer.py`
- Fetches hourly temperature, wind at 10m and 100m, shortwave radiation, and
  precipitation for each configured zone's representative coordinates.
- Run: `python pipelines/jobs/ingest_weather.py`

## Configuration

- `pipelines/configs/countries/denmark.yaml` — DK zones and coordinates.
- `pipelines/configs/sources/energidataservice.yaml` — endpoint/dataset config.
- Add `germany.yaml`, `united_states.yaml`, `japan.yaml` alongside these as
  adapters are built (see [multi_country_design.md](multi_country_design.md)).

## Sample data

Zones in `sample` mode (DE-LU, ERCOT, JP-TK) — and any live zone with an empty
database — are served by the deterministic generator in
`app/services/price_data.py`. To persist sample rows (e.g. for the simulator's
multi-day backtest), run:

```bash
cd backend
python -m scripts.seed_sample_data --days 14           # DE/US/JP
python -m scripts.seed_sample_data --days 14 --include-dk   # also DK, for offline demos
```

Seeded rows use `source="sample"`, so they never overwrite live ingested data.

## Licensing note

Open-Meteo is free for non-commercial use; review their terms before any
commercial deployment. Energi Data Service is open data. ENTSO-E requires a free
account and token. Respect each provider's rate limits — the ingestion jobs
fetch in bulk windows rather than per-hour to stay well within them.
