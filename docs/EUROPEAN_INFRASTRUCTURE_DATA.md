# European Infrastructure Data

This project now separates production infrastructure data from visual sample
fallbacks.

## Current Behavior

- `GET /api/v1/gis/assets?region=europe` returns backend infrastructure records.
- `GET /api/v1/infrastructure/summary?region=europe` groups capacity by country
  and fuel type.
- If no European infrastructure records exist, the backend seeds a curated
  European fleet so the map is immediately useful in local development.
- The seed is not a claim of full market completeness. It is a production-safe
  offline baseline with source metadata, intended to be replaced or expanded by
  importer jobs.

## Ingesting A Full Plant Registry

Use an OPSD or powerplantmatching-style CSV with plant name, country, latitude,
longitude, capacity, fuel, technology, operator, and status columns.

```powershell
cd backend
python pipelines/jobs/ingest_european_power_plants.py C:\path\to\power_plants.csv --source-year 2026
```

The importer accepts common column aliases such as:

- `name`, `Name`, `project_name`
- `country`, `country_code`, `ISO2`
- `lat`, `latitude`, `Latitude`
- `lon`, `lng`, `longitude`, `Longitude`
- `capacity`, `capacity_mw`, `electrical_capacity`
- `fuel`, `fuel_type`, `energy_source`
- `technology`, `Technology`, `type`

Rows without name, country, latitude, or longitude are skipped because they
cannot be mapped safely.

## Analytics Data Sources

Derivatives:

- Uses ingested `market_prices` when at least 24 recent day-ahead records exist.
- Returns `data_source: "ingested_market_prices"` in that case.
- Falls back to `data_source: "fallback_price_curve"` only when price history is
  not populated.

Gas and carbon:

- Uses `energy_market_marks` for `ttf_gas` and `eua_carbon`, plus ingested
  day-ahead power prices.
- Returns `data_source: "ingested_market_marks"` when seven aligned records are
  available.
- Falls back to `data_source: "fallback_market_marks"` when fuel/carbon marks
  are missing.

## Database Tables

- `infrastructure_assets`
- `infrastructure_links`
- `energy_market_marks`

Run migrations before deployment:

```powershell
cd backend
python -m alembic upgrade head
```

## Recommended External Sources

- [Open Power System Data](https://open-power-system-data.org/) conventional
  and renewable power plant packages.
- [OPSD conventional power plants](https://github.com/Open-Power-System-Data/conventional_power_plants)
  for plant-level European registry imports.
- [PyPSA-Eur](https://github.com/PyPSA/pypsa-eur/wiki/Home) or
  powerplantmatching-derived plant registries for model-grade European
  infrastructure.
- [ENTSO-E Transparency Platform](https://www.entsoe.eu/data/transparency-platform/)
  for generation, load, price, and transmission data where licensed/API
  credentials are available.

Always preserve source name and source year on imported records.
