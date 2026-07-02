from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def normalize_open_meteo_hourly_forecast(
    payload: dict[str, Any],
    *,
    country_code: str,
    zone: str,
    latitude: float,
    longitude: float,
) -> list[dict[str, Any]]:
    hourly = payload.get("hourly", {})

    times = hourly.get("time", [])
    temperatures = hourly.get("temperature_2m", [])
    wind_10m = hourly.get("wind_speed_10m", [])
    wind_100m = hourly.get("wind_speed_100m", [])
    shortwave = hourly.get("shortwave_radiation", [])
    precipitation = hourly.get("precipitation", [])

    records: list[dict[str, Any]] = []

    for index, time_value in enumerate(times):
        target_time_utc = _parse_open_meteo_time_as_utc(time_value)

        records.append(
            {
                "country_code": country_code,
                "zone": zone,
                "source": "open_meteo",
                "latitude": latitude,
                "longitude": longitude,
                "forecast_issue_time_utc": datetime.now(timezone.utc),
                "target_time_utc": target_time_utc,
                "temperature_2m_c": _get_or_none(temperatures, index),
                "wind_speed_10m_ms": _get_or_none(wind_10m, index),
                "wind_speed_100m_ms": _get_or_none(wind_100m, index),
                "shortwave_radiation_wm2": _get_or_none(shortwave, index),
                "precipitation_mm": _get_or_none(precipitation, index),
            }
        )

    return records


def _parse_open_meteo_time_as_utc(value: str) -> datetime:
    # Open-Meteo returns strings like "2026-06-04T00:00"
    # because we request timezone=UTC, we attach UTC timezone explicitly.
    parsed = datetime.fromisoformat(value)
    return parsed.replace(tzinfo=timezone.utc)


def _get_or_none(values: list[Any], index: int) -> float | None:
    if index >= len(values):
        return None

    value = values[index]

    if value is None:
        return None

    return float(value)