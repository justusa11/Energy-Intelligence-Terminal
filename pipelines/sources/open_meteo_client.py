from __future__ import annotations

from typing import Any

import requests


class OpenMeteoClient:
    def __init__(self, base_url: str = "https://api.open-meteo.com"):
        self.base_url = base_url.rstrip("/")

    def fetch_hourly_forecast(
        self,
        *,
        latitude: float,
        longitude: float,
        timezone: str = "UTC",
        forecast_days: int = 7,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/v1/forecast"

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ",".join(
                [
                    "temperature_2m",
                    "wind_speed_10m",
                    "wind_speed_100m",
                    "shortwave_radiation",
                    "precipitation",
                ]
            ),
            "timezone": timezone,
            "forecast_days": forecast_days,
        }

        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()