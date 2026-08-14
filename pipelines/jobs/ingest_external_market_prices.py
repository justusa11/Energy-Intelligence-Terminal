from __future__ import annotations

import argparse
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"

sys.path.append(str(BACKEND_ROOT))
sys.path.append(str(PROJECT_ROOT))

from app.db.session import SessionLocal
from app.models.ingestion_log import IngestionLog
from app.repositories.price_repository import create_market_price_if_not_exists
from pipelines.sources.entsoe_client import EntsoeClient
from pipelines.sources.ercot_client import ErcotClient
from pipelines.sources.jepx_client import JepxClient

ENTSOE_DOMAINS = {
    "DE-LU": "10Y1001A1001A82H",
}


def ingest_external_market_prices(*, country: str, zone: str | None = None, days: int = 3) -> dict[str, int | str]:
    country = country.upper()
    if country == "DE":
        return _ingest_entsoe_de_lu(zone=zone or "DE-LU", days=days)
    if country == "US":
        return _check_ercot(zone=zone or "ERCOT")
    if country == "JP":
        return _check_jepx(zone=zone or "JP-TK")
    raise ValueError(f"Unsupported external market country: {country}")


def _ingest_entsoe_de_lu(*, zone: str, days: int) -> dict[str, int | str]:
    client = EntsoeClient()
    db = SessionLocal()
    started_at = datetime.now(timezone.utc)
    rows_fetched = 0
    rows_inserted = 0
    rows_skipped = 0
    rows_failed = 0
    status_value = "success"
    message = "ENTSO-E DE-LU day-ahead ingestion completed."

    try:
        if not client.is_configured:
            status_value = "pending"
            message = "ENTSOE_API_KEY is not configured."
            return _finish_log(db, started_at, "entsoe", status_value, rows_fetched, rows_inserted, message)

        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        xml_text = client.fetch_day_ahead_prices(
            bidding_zone_domain=ENTSOE_DOMAINS[zone],
            period_start=(now - timedelta(days=days)).strftime("%Y%m%d%H%M"),
            period_end=(now + timedelta(days=1)).strftime("%Y%m%d%H%M"),
        )
        records = _parse_entsoe_prices(xml_text, country="DE", zone=zone)
        rows_fetched = len(records)
        for record in records:
            try:
                _, inserted = create_market_price_if_not_exists(db, **record)
                if inserted:
                    rows_inserted += 1
                else:
                    rows_skipped += 1
            except Exception:
                rows_failed += 1

        if rows_failed:
            status_value = "failed"
            message = f"ENTSO-E ingestion had {rows_failed} failed rows."
        return _finish_log(db, started_at, "entsoe", status_value, rows_fetched, rows_inserted, message)
    except Exception as exc:
        db.rollback()
        status_value = "failed"
        message = str(exc)
        return _finish_log(db, started_at, "entsoe", status_value, rows_fetched, rows_inserted, message)
    finally:
        db.close()


def _check_ercot(*, zone: str) -> dict[str, int | str]:
    client = ErcotClient()
    db = SessionLocal()
    started_at = datetime.now(timezone.utc)
    status_value = "pending" if not client.is_configured else "configured"
    message = (
        "ERCOT_API_SUBSCRIPTION_KEY is not configured."
        if not client.is_configured
        else f"ERCOT client configured for {zone}; set ERCOT_DAM_SPP_ENDPOINT before enabling ingestion."
    )
    try:
        return _finish_log(db, started_at, "ercot", status_value, 0, 0, message)
    finally:
        db.close()


def _check_jepx(*, zone: str) -> dict[str, int | str]:
    client = JepxClient()
    db = SessionLocal()
    started_at = datetime.now(timezone.utc)
    status_value = "pending" if not client.is_configured else "configured"
    message = (
        "JEPX_BASE_URL is not configured."
        if not client.is_configured
        else f"JEPX client configured for {zone}; map CSV columns before enabling writes."
    )
    try:
        return _finish_log(db, started_at, "jepx", status_value, 0, 0, message)
    finally:
        db.close()


def _parse_entsoe_prices(xml_text: str, *, country: str, zone: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    records: list[dict] = []
    for period in root.findall(".//{*}Period"):
        start_text = period.findtext("{*}timeInterval/{*}start")
        resolution = period.findtext("{*}resolution", default="PT60M")
        if not start_text:
            continue
        start = datetime.fromisoformat(start_text.replace("Z", "+00:00"))
        step = timedelta(hours=1) if resolution == "PT60M" else timedelta(minutes=15)
        for point in period.findall("{*}Point"):
            position_text = point.findtext("{*}position")
            price_text = point.findtext("{*}price.amount")
            if not position_text or not price_text:
                continue
            timestamp = start + (int(position_text) - 1) * step
            records.append(
                {
                    "country_code": country,
                    "market": "day_ahead",
                    "zone": zone,
                    "source": "entsoe",
                    "timestamp_utc": timestamp,
                    "local_timestamp": None,
                    "price": float(price_text),
                    "currency": "EUR",
                    "unit": "MWh",
                }
            )
    return records


def _finish_log(
    db,
    started_at: datetime,
    source: str,
    status_value: str,
    rows_fetched: int,
    rows_inserted: int,
    message: str,
) -> dict[str, int | str]:
    db.add(
        IngestionLog(
            source=source,
            dataset="external_market_prices",
            status=status_value,
            rows_fetched=rows_fetched,
            rows_inserted=rows_inserted,
            message=message,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return {
        "status": status_value,
        "rows_fetched": rows_fetched,
        "rows_inserted": rows_inserted,
        "message": message,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True, choices=["DE", "US", "JP"])
    parser.add_argument("--zone")
    parser.add_argument("--days", type=int, default=3)
    args = parser.parse_args()
    print(ingest_external_market_prices(country=args.country, zone=args.zone, days=args.days))
