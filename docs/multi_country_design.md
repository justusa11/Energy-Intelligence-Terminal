# Multi-Country Design

## Registry

All countries and bidding zones are declared in
`backend/app/core/countries.py`. This is the single source of truth; the
frontend selector (`frontend/lib/constants.ts`) mirrors it, and
`GET /market/countries` serves it to clients.

```python
Zone(code="DK1", name="West Denmark", data_mode="live", base_price=68.0, volatility=1.2)
```

| Field | Meaning |
|---|---|
| `code` | Zone code used in all APIs (`DK1`, `DE-LU`, `ERCOT`, `JP-TK`) |
| `name` | Human label |
| `data_mode` | `live` (ingested) or `sample` (synthetic until an adapter exists) |
| `currency` | `EUR`, `USD`, `JPY` |
| `base_price`, `volatility` | Shape parameters for the sample generator |

## Current zones

| Country | Zone | Mode | Currency |
|---|---|---|---|
| Denmark (DK) | DK1, DK2 | live | EUR |
| Germany (DE) | DE-LU | sample | EUR |
| United States (US) | ERCOT | sample | USD |
| Japan (JP) | JP-TK | sample | JPY |

## Live vs sample

- **Live** zones are populated by ingestion jobs and read straight from the DB.
- **Sample** zones (and any live zone with an empty DB) are served by the
  deterministic generator in `services/price_data.py`. The generator is seeded
  by `country+zone+hour`, so results are reproducible across runs, tests, and
  reports.
- Every analytics payload exposes `data_source: "database" | "sample"`, and the
  UI's zone selector marks sample zones with "(sample)". Nothing is hidden.

## Adding a country/zone

1. **Register it** in `countries.py` (start with `data_mode="sample"`).
2. **Mirror it** in `frontend/lib/constants.ts` `zones` array.
3. It immediately works end-to-end on synthetic data — every module, the
   advisor, and reports.
4. **Build the live adapter** when ready:
   - Add a source client under `pipelines/sources/`.
   - Add a normalizer under `pipelines/normalizers/` that outputs the common
     shape (`country_code, market, zone, source, timestamp_utc, price, currency,
     unit`).
   - Add an ingestion job under `pipelines/jobs/` and a config under
     `pipelines/configs/countries/`.
   - Flip `data_mode` to `live`.

Because every zone shares one schema and one series abstraction, no analytics
code changes when a new country is added — only ingestion.

## Currency note

Prices are stored and displayed in each zone's native currency (`currency`
column / field). The MVP does not convert between currencies; cross-zone
comparisons should account for this. FX normalization is a roadmap item.
