from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"

sys.path.append(str(BACKEND_ROOT))
sys.path.append(str(PROJECT_ROOT))

from app.db.session import SessionLocal
from app.models.ingestion_log import IngestionLog
from app.repositories.price_repository import create_market_price_if_not_exists
from pipelines.normalizers.price_normalizer import normalize_energidata_day_ahead_record
from pipelines.sources.energidataservice_client import EnergiDataServiceClient


def ingest_denmark_day_ahead_prices(
    *,
    price_areas: list[str] | None = None,
    limit: int = 5000,
) -> dict[str, int]:
    if price_areas is None:
        price_areas = ["DK1", "DK2"]

    now = datetime.now(timezone.utc)
    started_at = now

    start = (now - timedelta(days=10)).strftime("%Y-%m-%dT%H:%M")
    end = (now + timedelta(days=3)).strftime("%Y-%m-%dT%H:%M")

    client = EnergiDataServiceClient()
    db = SessionLocal()

    rows_fetched = 0
    rows_inserted = 0
    rows_skipped = 0
    rows_failed = 0

    try:
        for area in price_areas:
            records = client.fetch_day_ahead_prices(
                price_area=area,
                start=start,
                end=end,
                limit=limit,
            )

            rows_fetched += len(records)

            for record in records:
                try:
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

                except Exception as exc:
                    rows_failed += 1
                    print(f"Failed to process record for {area}: {exc}")

        status = "success" if rows_failed == 0 and rows_fetched > 0 else "warning"
        message = (
            f"Fetched {rows_fetched} Denmark day-ahead price rows; "
            f"inserted {rows_inserted}, skipped {rows_skipped}, failed {rows_failed}."
        )
        _write_ingestion_log(
            db,
            dataset="market_prices",
            source="energi_data_service",
            status=status,
            rows_fetched=rows_fetched,
            rows_inserted=rows_inserted,
            message=message,
            started_at=started_at,
        )

        return {
            "status": status,
            "rows_fetched": rows_fetched,
            "rows_inserted": rows_inserted,
            "rows_skipped": rows_skipped,
            "rows_failed": rows_failed,
        }

    finally:
        db.close()


def _write_ingestion_log(
    db,
    *,
    dataset: str,
    source: str,
    status: str,
    rows_fetched: int,
    rows_inserted: int,
    message: str,
    started_at: datetime,
) -> None:
    db.add(
        IngestionLog(
            source=source,
            dataset=dataset,
            status=status,
            rows_fetched=rows_fetched,
            rows_inserted=rows_inserted,
            message=message,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
        )
    )
    db.commit()


if __name__ == "__main__":
    result = ingest_denmark_day_ahead_prices()
    print(result)
