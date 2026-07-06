# GIS / Infrastructure Map Architecture

## Goal

Show energy infrastructure — market zones, interconnectors, LNG terminals, wind
farms, power plants, and risk markers — on an interactive map, starting with a
self-contained sample dataset for Northern Europe.

## Current implementation (MVP)

To keep the frontend build dependency-free and fast, the map is a hand-rolled
**SVG** rather than a tile-based map library. This avoids shipping a large
mapping bundle and works offline.

- **Data:** `frontend/lib/sampleGis.ts` — typed sample assets and links with
  lon/lat coordinates, plus `assetStyles` (colors/labels) and a `project()`
  function that maps lon/lat into the SVG viewport using fixed `MAP_BOUNDS`.
- **View:** `frontend/app/dashboard/infrastructure-map/page.tsx` — renders
  interconnector lines and asset markers, supports type filtering, and shows a
  detail panel on click, plus a legend.

### Asset types

| Type | Example | Rendered as |
|---|---|---|
| `market_zone` | DK1, DK2, DE-LU | translucent circle |
| `interconnector` | Kontek, COBRAcable | dashed line |
| `lng_terminal` | Gate LNG (Rotterdam) | solid marker |
| `wind_farm` | Horns Rev 3 | solid marker |
| `power_plant` | Avedøre | solid marker |
| `risk_marker` | congestion point | solid marker |

## Path to production GIS

When richer geography is needed:

1. Replace `sampleGis.ts` with real **GeoJSON** feeds (zones, lines, points).
2. Swap the inline SVG for a map library (MapLibre GL or Leaflet) if pan/zoom
   and basemaps are required. Keep the same asset-type/color taxonomy so the
   legend and filters carry over.
3. Serve GeoJSON from the backend (e.g. `GET /gis/assets?bbox=...`) if datasets
   grow beyond what can be bundled, and add spatial filtering.
4. Consider PostGIS on the database side for spatial queries.

The current abstraction (typed assets + `project()` + styles) is deliberately
small so this migration touches one data file and one page.
