from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"

sys.path.append(str(BACKEND_ROOT))
sys.path.append(str(PROJECT_ROOT))

from app.db.session import SessionLocal
from app.repositories.weather_repository import create_weather_forecast_if_not_exists
from pipelines.normalizers.weather_normalizer import normalize_open_meteo_hourly_forecast
from pipelines.sources.open_meteo_client import OpenMeteoClient


DENMARK_WEATHER_ZONES = {
    "DK1": {
        "latitude": 56.2639,
        "longitude": 9.5018,
    },
    "DK2": {
        "latitude": 55.6761,
        "longitude": 12.5683,
    },
}


def ingest_denmark_weather_forecasts() -> dict[str, int]:
    client = OpenMeteoClient()
    db = SessionLocal()

    rows_fetched = 0
    rows_inserted = 0
    rows_skipped = 0

    try:
        for zone, coordinates in DENMARK_WEATHER_ZONES.items():
            payload = client.fetch_hourly_forecast(
                latitude=coordinates["latitude"],
                longitude=coordinates["longitude"],
                timezone="UTC",
                forecast_days=7,
            )

            records = normalize_open_meteo_hourly_forecast(
                payload,
                country_code="DK",
                zone=zone,
                latitude=coordinates["latitude"],
                longitude=coordinates["longitude"],
            )

            rows_fetched += len(records)

            for record in records:
                _, inserted = create_weather_forecast_if_not_exists(
                    db,
                    country_code=record["country_code"],
                    zone=record["zone"],
                    source=record["source"],
                    latitude=record["latitude"],
                    longitude=record["longitude"],
                    forecast_issue_time_utc=record["forecast_issue_time_utc"],
                    target_time_utc=record["target_time_utc"],
                    temperature_2m_c=record["temperature_2m_c"],
                    wind_speed_10m_ms=record["wind_speed_10m_ms"],
                    wind_speed_100m_ms=record["wind_speed_100m_ms"],
                    shortwave_radiation_wm2=record["shortwave_radiation_wm2"],
                    precipitation_mm=record["precipitation_mm"],
                )

                if inserted:
                    rows_inserted += 1
                else:
                    rows_skipped += 1

        return {
            "rows_fetched": rows_fetched,
            "rows_inserted": rows_inserted,
            "rows_skipped": rows_skipped,
        }

    finally:
        db.close()


if __name__ == "__main__":
    result = ingest_denmark_weather_forecasts()
    print(result)