"""Seed sample day-ahead prices for sample-mode zones (DE, US, JP).

Usage (from backend/):
    .venv/Scripts/python.exe -m scripts.seed_sample_data [--days 14] [--include-dk]

Generates deterministic synthetic prices via the same generator used by
the API fallback, and stores them with source="sample" so live and sample
data never collide (unique constraint includes source).
"""

import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.countries import COUNTRIES  # noqa: E402
from app.db.init_db import init_db  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.repositories.price_repository import create_market_price_if_not_exists  # noqa: E402
from app.services.price_data import generate_sample_series  # noqa: E402


def seed(days: int, include_dk: bool) -> None:
    init_db()
    db = SessionLocal()
    inserted_total = 0

    end_time = datetime.now(timezone.utc).replace(
        minute=0, second=0, microsecond=0
    ) + timedelta(hours=24)

    try:
        for country in COUNTRIES.values():
            for zone in country.zones:
                if zone.data_mode == "live" and not include_dk:
                    continue

                series = generate_sample_series(
                    country=country.code,
                    zone=zone.code,
                    hours=days * 24,
                    end_time=end_time,
                )

                inserted = 0
                for point in series.points:
                    _, was_inserted = create_market_price_if_not_exists(
                        db,
                        country_code=country.code,
                        market="day_ahead",
                        zone=zone.code,
                        source="sample",
                        timestamp_utc=point.timestamp_utc,
                        price=point.price,
                        currency=zone.currency,
                        unit="MWh",
                    )
                    inserted += int(was_inserted)

                inserted_total += inserted
                print(f"{country.code}/{zone.code}: inserted {inserted} sample prices")
    finally:
        db.close()

    print(f"Done. {inserted_total} rows inserted.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=14)
    parser.add_argument(
        "--include-dk",
        action="store_true",
        help="Also seed sample data for live zones (DK1/DK2), e.g. for offline demos.",
    )
    args = parser.parse_args()
    seed(days=args.days, include_dk=args.include_dk)
