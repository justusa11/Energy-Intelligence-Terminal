from __future__ import annotations

import os
from typing import Any

import requests


class ErcotClient:
    """ERCOT public data access client.

    ERCOT's public API requires accepting terms and registering for API access.
    This client keeps the integration explicit instead of silently scraping pages.
    """

    def __init__(
        self,
        *,
        base_url: str = "https://api.ercot.com/api/public-reports",
        subscription_key: str | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.subscription_key = subscription_key or os.getenv("ERCOT_API_SUBSCRIPTION_KEY")

    @property
    def is_configured(self) -> bool:
        return bool(self.subscription_key)

    def fetch_report(self, *, endpoint: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.subscription_key:
            raise RuntimeError(
                "ERCOT_API_SUBSCRIPTION_KEY is required. Register through ERCOT's public API portal first."
            )

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        response = requests.get(
            url,
            params=params or {},
            headers={"Ocp-Apim-Subscription-Key": self.subscription_key},
            timeout=45,
        )
        if not response.ok:
            raise requests.HTTPError(
                f"ERCOT returned {response.status_code} for {response.url}: {response.text[:500]}",
                response=response,
            )
        return response.json()
