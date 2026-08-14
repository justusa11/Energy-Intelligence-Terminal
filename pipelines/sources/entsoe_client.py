from __future__ import annotations

import os
from typing import Any

import requests


class EntsoeClient:
    """Minimal ENTSO-E Transparency Platform client for day-ahead prices."""

    def __init__(
        self,
        *,
        base_url: str = "https://web-api.tp.entsoe.eu/api",
        api_key: str | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key or os.getenv("ENTSOE_API_KEY")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def fetch_day_ahead_prices(
        self,
        *,
        bidding_zone_domain: str,
        period_start: str,
        period_end: str,
    ) -> str:
        if not self.api_key:
            raise RuntimeError("ENTSOE_API_KEY is required for ENTSO-E day-ahead price ingestion.")

        params: dict[str, Any] = {
            "securityToken": self.api_key,
            "documentType": "A44",
            "in_Domain": bidding_zone_domain,
            "out_Domain": bidding_zone_domain,
            "periodStart": period_start,
            "periodEnd": period_end,
        }
        response = requests.get(self.base_url, params=params, timeout=45)
        if not response.ok:
            raise requests.HTTPError(
                f"ENTSO-E returned {response.status_code} for {response.url}: {response.text[:500]}",
                response=response,
            )
        return response.text
