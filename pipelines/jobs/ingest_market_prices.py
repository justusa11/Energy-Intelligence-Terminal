from __future__ import annotations

import sys
from pathlib import Path

# Allow script to import backend app modules when run from project root
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"

sys.path.append(str(BACKEND_ROOT))
sys.path.append(str(PROJECT_ROOT))

from app.db.session import SessionLocal
from app.repositories.price_repository import create_market_price_if_not_exists
from pipelines.normalizers.price_normalizer import normalize_energidata_day_ahead_record
from pipelines.configs.sources.energidataservice_client import EnergiDataServiceClient


def ingest_denmark_day_ahead_prices(
    *,
    price_areas: list[str] | None = None,
    limit: int = 5000,
) -> dict[str, int]:
    if price_areas is None:
        price_areas = ["DK1", "DK2"]

    client = EnergiDataServiceClient()
    db = SessionLocal()

    rows_fetched = 0
    rows_inserted = 0
    rows_skipped = 0

    try:
        for area in price_areas:
            records = client.fetch_day_ahead_prices(
                price_area=area,
                limit=limit,
            )

            rows_fetched += len(records)

            for record in records:
                normalized = normalize_energidata_day_ahead_record(record)

                _, inserted = create_market_price_if_not_exists(
                    db,
                    country_code=normalized["country_code"],
                    market=normalized["market"],
                    zone=normalized["zone"],
                    source=normalized["source"],
                    timestamp_utc=normalized["timestamp_utc"],
                    local_timestamp=normalized["local_timestamp"],
                    price=normalized["price"],
                    currency=normalized["currency"],
                    unit=normalized["unit"],
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
    result = ingest_denmark_day_ahead_prices()
    print(result)
