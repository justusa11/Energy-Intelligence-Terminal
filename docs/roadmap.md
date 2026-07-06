# Roadmap

The original 24-week plan (from the project timeline workbook) and what is now
built.

## Delivered (MVP)

| Weeks | Theme | Status |
|---|---|---|
| 1–4 | Foundation + UI shell | ✅ Done |
| 5–8 | Energy data layer (DK prices, weather, data quality) | ✅ Done |
| 9–12 | Market cockpit + forecasting (prices page, features, baseline model, regimes) | ✅ Done |
| 13–16 | Recommendations + risk (screener, flexibility optimizer, risk engine, recommendation UI) | ✅ Done |
| 17–20 | Multi-country + advanced (DE/US/JP registry + sample data, trading simulator, infrastructure map) | ✅ Done |
| 21–23 | AI advisor + reports | ✅ Done |
| 24 | Polish + docs + deployment guides | ✅ Done |

### What "done" means here
Every module renders and is wired to a working endpoint. Denmark runs on live
data; other countries run on deterministic sample data with a clear path to
live adapters. Backend contract tests pass; the frontend builds clean.

## Next (post-MVP)

**Data & models**
- Real ENTSO-E adapter for Germany (token-based); flip DE-LU to live.
- ERCOT and JEPX adapters for US/Japan.
- Upgrade forecasting: gradient-boosted trees or quantile models in `ml/`,
  served behind the same `/forecast` contract; add prediction intervals.
- FX normalization for cross-currency comparison.

**Product**
- Real authentication (Supabase Auth) replacing the placeholder login.
- Gas & Carbon module (TTF, EUA, spark/clean-spark spreads).
- Derivatives module (forward curves, volatility).
- Alerting on regime changes and risk-gate flips.
- Persisted user settings (default country/zone, asset parameters).

**Platform**
- Short-TTL response cache in front of analytics endpoints.
- Scheduled ingestion via GitHub Actions in production (workflow provided in
  [deployment.md](deployment.md)).
- Raw-payload snapshots to Cloudflare R2 for audit/reprocessing.
- Sentry + uptime monitoring before public launch.

**GIS**
- Replace sample GIS with real GeoJSON feeds; optional MapLibre basemap.
- Backend `/gis/assets` endpoint with bbox filtering; PostGIS if needed.

See [GO_TO_MARKET.md](GO_TO_MARKET.md) for how these map to customer segments.
