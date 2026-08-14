from __future__ import annotations

import time
from typing import Any

import requests
from requests import HTTPError

TRANSIENT_STATUS_CODES = {429, 500, 502, 503, 504}


class OpenMeteoClient:
    def __init__(
        self,
        base_url: str = "https://api.open-meteo.com",
        *,
        max_retries: int = 3,
        retry_delay_seconds: float = 2.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.max_retries = max_retries
        self.retry_delay_seconds = retry_delay_seconds

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

        last_error: HTTPError | None = None
        for attempt in range(self.max_retries + 1):
            response = requests.get(url, params=params, timeout=30)
            try:
                response.raise_for_status()
                return response.json()
            except HTTPError as exc:
                last_error = exc
                status_code = response.status_code
                if status_code not in TRANSIENT_STATUS_CODES or attempt == self.max_retries:
                    raise
                time.sleep(self.retry_delay_seconds * (attempt + 1))

        if last_error:
            raise last_error
        raise RuntimeError("Open-Meteo request failed without an HTTP response")
