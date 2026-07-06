from sqlalchemy.orm import Session

from app.repositories.data_quality_repository import (
    count_duplicate_market_price_timestamps,
    count_duplicate_weather_timestamps,
    count_market_prices,
    count_null_market_prices,
    count_null_weather_values,
    count_weather_forecasts,
    get_latest_market_price_timestamp,
    get_latest_weather_target_timestamp,
    hours_since,
)
from app.schemas.data_quality import DataQualityCheck, DataQualityResponse


def get_data_quality_status(
    db: Session,
    *,
    country: str = "DK",
    zone: str = "DK1",
) -> DataQualityResponse:
    checks: list[DataQualityCheck] = []

    checks.append(_check_price_coverage(db, country=country, zone=zone))
    checks.append(_check_price_missing_values(db, country=country, zone=zone))
    checks.append(_check_price_duplicates(db, country=country, zone=zone))
    checks.append(_check_price_freshness(db, country=country, zone=zone))

    checks.append(_check_weather_coverage(db, country=country, zone=zone))
    checks.append(_check_weather_missing_values(db, country=country, zone=zone))
    checks.append(_check_weather_duplicates(db, country=country, zone=zone))
    checks.append(_check_weather_freshness(db, country=country, zone=zone))

    overall_status = _derive_overall_status(checks)

    return DataQualityResponse(
        country=country,
        zone=zone,
        status=overall_status,
        checks=checks,
    )


def _check_price_coverage(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    count = count_market_prices(db, country_code=country, zone=zone)

    if count >= 24:
        return DataQualityCheck(
            name="Price coverage",
            status="OK",
            severity="low",
            message=f"{count} price records available.",
        )

    if count > 0:
        return DataQualityCheck(
            name="Price coverage",
            status="WARNING",
            severity="medium",
            message=f"Only {count} price records found. Expected at least 24.",
        )

    return DataQualityCheck(
        name="Price coverage",
        status="FAILED",
        severity="high",
        message="No price records found.",
    )


def _check_price_missing_values(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    missing_count = count_null_market_prices(db, country_code=country, zone=zone)

    if missing_count == 0:
        return DataQualityCheck(
            name="Price missing values",
            status="OK",
            severity="low",
            message="No missing price values found.",
        )

    return DataQualityCheck(
        name="Price missing values",
        status="FAILED",
        severity="high",
        message=f"{missing_count} price records have missing values.",
    )


def _check_price_duplicates(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    duplicate_count = count_duplicate_market_price_timestamps(
        db,
        country_code=country,
        zone=zone,
    )

    if duplicate_count == 0:
        return DataQualityCheck(
            name="Price duplicate timestamps",
            status="OK",
            severity="low",
            message="No duplicate price timestamps found.",
        )

    return DataQualityCheck(
        name="Price duplicate timestamps",
        status="FAILED",
        severity="high",
        message=f"{duplicate_count} duplicate price timestamps found.",
    )


def _check_price_freshness(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    latest_timestamp = get_latest_market_price_timestamp(
        db,
        country_code=country,
        zone=zone,
    )

    age_hours = hours_since(latest_timestamp)

    if age_hours is None:
        return DataQualityCheck(
            name="Price freshness",
            status="FAILED",
            severity="high",
            message="No price timestamp found.",
        )

    # Day-ahead prices are not continuously updated like live telemetry.
    # For MVP, allow 72 hours before warning.
    if age_hours <= 72:
        return DataQualityCheck(
            name="Price freshness",
            status="OK",
            severity="low",
            message=f"Latest price timestamp is {age_hours:.1f} hours old.",
        )

    return DataQualityCheck(
        name="Price freshness",
        status="WARNING",
        severity="medium",
        message=f"Latest price timestamp is stale: {age_hours:.1f} hours old.",
    )


def _check_weather_coverage(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    count = count_weather_forecasts(db, country_code=country, zone=zone)

    if count >= 24:
        return DataQualityCheck(
            name="Weather coverage",
            status="OK",
            severity="low",
            message=f"{count} weather forecast records available.",
        )

    if count > 0:
        return DataQualityCheck(
            name="Weather coverage",
            status="WARNING",
            severity="medium",
            message=f"Only {count} weather forecast records found. Expected at least 24.",
        )

    return DataQualityCheck(
        name="Weather coverage",
        status="FAILED",
        severity="high",
        message="No weather forecast records found.",
    )


def _check_weather_missing_values(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    missing_count = count_null_weather_values(db, country_code=country, zone=zone)

    if missing_count == 0:
        return DataQualityCheck(
            name="Weather missing values",
            status="OK",
            severity="low",
            message="No missing core weather values found.",
        )

    return DataQualityCheck(
        name="Weather missing values",
        status="WARNING",
        severity="medium",
        message=f"{missing_count} weather records have missing core values.",
    )


def _check_weather_duplicates(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    duplicate_count = count_duplicate_weather_timestamps(
        db,
        country_code=country,
        zone=zone,
    )

    if duplicate_count == 0:
        return DataQualityCheck(
            name="Weather duplicate timestamps",
            status="OK",
            severity="low",
            message="No duplicate weather timestamps found.",
        )

    return DataQualityCheck(
        name="Weather duplicate timestamps",
        status="FAILED",
        severity="high",
        message=f"{duplicate_count} duplicate weather timestamps found.",
    )


def _check_weather_freshness(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    latest_timestamp = get_latest_weather_target_timestamp(
        db,
        country_code=country,
        zone=zone,
    )

    age_hours = hours_since(latest_timestamp)

    if age_hours is None:
        return DataQualityCheck(
            name="Weather freshness",
            status="FAILED",
            severity="high",
            message="No weather timestamp found.",
        )

    # Weather forecast target time may be in the future.
    # Negative age means the forecast extends ahead of current time.
    if age_hours <= 6:
        return DataQualityCheck(
            name="Weather freshness",
            status="OK",
            severity="low",
            message=f"Weather forecast is current. Latest target is {age_hours:.1f} hours old.",
        )

    return DataQualityCheck(
        name="Weather freshness",
        status="WARNING",
        severity="medium",
        message=f"Latest weather forecast target is stale: {age_hours:.1f} hours old.",
    )


def _derive_overall_status(checks: list[DataQualityCheck]) -> str:
    if any(check.status == "FAILED" for check in checks):
        return "FAILED"

    if any(check.status == "WARNING" for check in checks):
        return "WARNING"

    return "OK"