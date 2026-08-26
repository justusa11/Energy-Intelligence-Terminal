from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(PROJECT_ROOT))

from app.db.session import SessionLocal
from app.models.ingestion_log import IngestionLog
from app.repositories.weather_repository import create_weather_forecast_if_not_exists


DENMARK_WEATHER_ZONES = {
    "DK1": {"latitude": 56.2639, "longitude": 9.5018},
    "DK2": {"latitude": 55.6761, "longitude": 12.5683},
}


def ingest_practice_weather_forecasts() -> dict[str, int | str]:
    started_at = datetime.now(timezone.utc)
    db = SessionLocal()
    rows_fetched = 0
    rows_inserted = 0
    rows_skipped = 0

    try:
        for zone, coordinates in DENMARK_WEATHER_ZONES.items():
            records = _practice_weather_records(
                country_code="DK",
                zone=zone,
                latitude=coordinates["latitude"],
                longitude=coordinates["longitude"],
            )
            rows_fetched += len(records)

            for record in records:
                _, inserted = create_weather_forecast_if_not_exists(db, **record)
                if inserted:
                    rows_inserted += 1
                else:
                    rows_skipped += 1

        message = (
            f"Generated {rows_fetched} practice weather rows; "
            f"inserted {rows_inserted}, skipped {rows_skipped}."
        )
        db.add(
            IngestionLog(
                source="practice_weather",
                dataset="weather_forecasts",
                status="success",
                rows_fetched=rows_fetched,
                rows_inserted=rows_inserted,
                message=message,
                started_at=started_at,
                finished_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
        return {
            "status": "success",
            "rows_fetched": rows_fetched,
            "rows_inserted": rows_inserted,
            "rows_skipped": rows_skipped,
        }
    finally:
        db.close()


def _practice_weather_records(
    *,
    country_code: str,
    zone: str,
    latitude: float,
    longitude: float,
) -> list[dict[str, object]]:
    issue_time = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    zone_offset = 0.0 if zone == "DK1" else 1.2
    records: list[dict[str, object]] = []

    for hour in range(72):
        target_time = issue_time + timedelta(hours=hour)
        daylight = max(0.0, 1 - abs((target_time.hour - 13) / 7))
        wind_cycle = ((hour * 7) % 19) / 19
        records.append(
            {
                "country_code": country_code,
                "zone": zone,
                "source": "open_meteo",
                "latitude": latitude,
                "longitude": longitude,
                "forecast_issue_time_utc": issue_time,
                "target_time_utc": target_time,
                "temperature_2m_c": 7.5 + zone_offset + daylight * 5.2,
                "wind_speed_10m_ms": 4.0 + wind_cycle * 5.0,
                "wind_speed_100m_ms": 6.5 + wind_cycle * 7.5,
                "shortwave_radiation_wm2": daylight * 340,
                "precipitation_mm": 0.0 if hour % 9 else 0.4,
            }
        )

    return records


if __name__ == "__main__":
    print(ingest_practice_weather_forecasts())
