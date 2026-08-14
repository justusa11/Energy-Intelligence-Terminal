from __future__ import annotations

import csv
import io
import os

import requests


class JepxClient:
    """JEPX CSV download client for day-ahead spot market data."""

    def __init__(self, *, base_url: str | None = None):
        self.base_url = (base_url or os.getenv("JEPX_BASE_URL") or "").rstrip("/")

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url)

    def fetch_spot_csv(self, *, year: int) -> list[dict[str, str]]:
        if not self.base_url:
            raise RuntimeError(
                "JEPX_BASE_URL is required for JEPX CSV ingestion, for example a licensed/public CSV mirror base URL."
            )

        url = f"{self.base_url}/spot_{year}.csv"
        response = requests.get(url, timeout=45)
        if not response.ok:
            raise requests.HTTPError(
                f"JEPX returned {response.status_code} for {response.url}: {response.text[:500]}",
                response=response,
            )

        text = response.content.decode("utf-8-sig", errors="replace")
        return list(csv.DictReader(io.StringIO(text)))
