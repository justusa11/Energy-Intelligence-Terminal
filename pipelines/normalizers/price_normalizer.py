from __future__ import annotations

from datetime import datetime
from typing import Any


def normalize_energidata_day_ahead_record(record: dict[str, Any]) -> dict[str, Any]:
    """
    Convert Energi Data Service DayAheadPrices records into the platform schema.
    """

    timestamp_utc_raw = _first_present(record, "TimeUTC", "HourUTC")
    local_timestamp_raw = _first_present(record, "TimeDK", "HourDK")
    zone = record.get("PriceArea")

    price_eur = _first_present(record, "DayAheadPriceEUR", "SpotPriceEUR")
    price_dkk = _first_present(record, "DayAheadPriceDKK", "SpotPriceDKK")

    if timestamp_utc_raw is None:
        raise ValueError(f"Missing TimeUTC/HourUTC in record: {record}")

    if zone is None:
        raise ValueError(f"Missing PriceArea in record: {record}")

    if price_eur is None and price_dkk is None:
        raise ValueError(
            f"Missing DayAheadPriceEUR/SpotPriceEUR or DayAheadPriceDKK/SpotPriceDKK "
            f"in record: {record}"
        )

    timestamp_utc = _parse_datetime(timestamp_utc_raw)
    local_timestamp = _parse_datetime(local_timestamp_raw) if local_timestamp_raw else None

    if price_eur is not None:
        price = float(price_eur)
        currency = "EUR"
    else:
        price = float(price_dkk)
        currency = "DKK"

    return {
        "country_code": "DK",
        "market": "day_ahead",
        "zone": str(zone),
        "source": "energidataservice",
        "timestamp_utc": timestamp_utc,
        "local_timestamp": local_timestamp,
        "price": price,
        "currency": currency,
        "unit": "MWh",
    }


def _parse_datetime(value: str) -> datetime:
    value = value.replace("Z", "+00:00")
    return datetime.fromisoformat(value)


def _first_present(record: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = record.get(key)
        if value is not None:
            return value

    return None
