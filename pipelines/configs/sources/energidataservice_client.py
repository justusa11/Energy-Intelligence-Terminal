from __future__ import annotations

import json
from typing import Any

import requests

# DEFINE CLASS
class EnergiDataServiceClient:
    def __init__(self, base_url: str = "https://api.energidataservice.dk"):
        self.base_url = base_url.rstrip("/")

    def fetch_day_ahead_prices(
        self,
        *,
        price_area: str,
        start: str | None = None,
        end: str | None = None,
        limit: int = 5000,
    ) -> list[dict[str, Any]]:
        """
        Fetch day-ahead prices from Energi Data Service.

        start/end should be ISO-like strings if supplied, for example:
        2026-06-01T00:00
        """
        url = f"{self.base_url}/dataset/DayAheadPrices"

        params: dict[str, Any] = {
            "limit": limit,
            "filter": json.dumps({"PriceArea": [price_area]}, separators=(",", ":")),
            "sort": "TimeUTC desc",
        }

        if start and end:
            params["start"] = start
            params["end"] = end
        
        response = requests.get(url, params=params, timeout=30)
        if not response.ok:
            raise requests.HTTPError(
                f"Energi Data Service returned {response.status_code} for "
                f"{response.url}: {response.text}",
                response=response,
            )

        payload = response.json()
        records = payload.get("records", [])

        if not isinstance(records, list):
            raise ValueError("Unexpected Energi Data Service response: records is not a list")

        return records
