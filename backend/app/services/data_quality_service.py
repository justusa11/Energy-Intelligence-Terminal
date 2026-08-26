from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.countries import get_zone
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

PRICE_REPAIR_COMMAND = "python pipelines/jobs/ingest_market_prices.py"
WEATHER_REPAIR_COMMAND = "docker compose exec backend python pipelines/jobs/ingest_weather.py"


def get_data_quality_status(
    db: Session,
    *,
    country: str = "DK",
    zone: str = "DK1",
) -> DataQualityResponse:
    zone_cfg = get_zone(country, zone)
    if zone_cfg and zone_cfg.data_mode == "sample":
        return _fallback_quality(country=country, zone=zone)

    checks: list[DataQualityCheck] = []

    try:
        checks.append(_check_price_coverage(db, country=country, zone=zone))
        checks.append(_check_price_missing_values(db, country=country, zone=zone))
        checks.append(_check_price_duplicates(db, country=country, zone=zone))
        checks.append(_check_price_freshness(db, country=country, zone=zone))

        checks.append(_check_weather_coverage(db, country=country, zone=zone))
        checks.append(_check_weather_missing_values(db, country=country, zone=zone))
        checks.append(_check_weather_duplicates(db, country=country, zone=zone))
        checks.append(_check_weather_freshness(db, country=country, zone=zone))
    except SQLAlchemyError:
        db.rollback()
        return _fallback_quality(country=country, zone=zone)

    overall_status = _derive_overall_status(checks)

    return DataQualityResponse(
        country=country,
        zone=zone,
        status=overall_status,
        checks=checks,
    )


def _fallback_quality(*, country: str, zone: str) -> DataQualityResponse:
    checks = [
        DataQualityCheck(
            name="Sample price fallback",
            status="OK",
            severity="low",
            message=f"{zone} runs on deterministic sample price curves until live ingestion is connected.",
            table="market_prices",
            source="sample_fallback",
            expected="At least 24 recent day-ahead price records.",
            repair_command=PRICE_REPAIR_COMMAND,
            fallback_used=True,
        ),
        DataQualityCheck(
            name="Sample weather fallback",
            status="OK",
            severity="low",
            message=f"{zone} runs on deterministic sample weather until live ingestion is connected.",
            table="weather_forecasts",
            source="sample_fallback",
            expected="At least 24 recent weather forecast records.",
            repair_command=WEATHER_REPAIR_COMMAND,
            fallback_used=True,
        ),
    ]
    return DataQualityResponse(country=country, zone=zone, status="OK", checks=checks)


def _check_price_coverage(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    count = count_market_prices(db, country_code=country, zone=zone)
    latest = get_latest_market_price_timestamp(db, country_code=country, zone=zone)

    if count >= 24:
        return _price_check(
            name="Price coverage",
            status="OK",
            severity="low",
            message=f"{count} price records available.",
            latest=latest,
        )

    if count > 0:
        return _price_check(
            name="Price coverage",
            status="WARNING",
            severity="medium",
            message=f"Only {count} price records found. Expected at least 24.",
            latest=latest,
        )

    return _price_check(
        name="Price coverage",
        status="FAILED",
        severity="high",
        message="No price records found.",
        latest=latest,
    )


def _check_price_missing_values(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    missing_count = count_null_market_prices(db, country_code=country, zone=zone)

    if missing_count == 0:
        return _price_check(
            name="Price missing values",
            status="OK",
            severity="low",
            message="No missing price values found.",
        )

    return _price_check(
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
        return _price_check(
            name="Price duplicate timestamps",
            status="OK",
            severity="low",
            message="No duplicate price timestamps found.",
        )

    return _price_check(
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
        return _price_check(
            name="Price freshness",
            status="FAILED",
            severity="high",
            message="No price timestamp found.",
        )

    # Day-ahead prices are not continuous telemetry, but a production terminal
    # should warn once the current day-ahead curve is missing.
    if age_hours <= 36:
        return _price_check(
            name="Price freshness",
            status="OK",
            severity="low",
            message=f"Latest price timestamp is {age_hours:.1f} hours old.",
        )

    return _price_check(
        name="Price freshness",
        status="WARNING",
        severity="medium",
        message=f"Latest price timestamp is stale: {age_hours:.1f} hours old.",
    )


def _check_weather_coverage(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    count = count_weather_forecasts(db, country_code=country, zone=zone)
    latest = get_latest_weather_target_timestamp(db, country_code=country, zone=zone)

    if count >= 24:
        return _weather_check(
            name="Weather coverage",
            status="OK",
            severity="low",
            message=f"{count} weather forecast records available.",
            latest=latest,
        )

    if count > 0:
        return _weather_check(
            name="Weather coverage",
            status="WARNING",
            severity="medium",
            message=f"Only {count} weather forecast records found. Expected at least 24.",
            latest=latest,
        )

    return _weather_check(
        name="Weather coverage",
        status="FAILED",
        severity="high",
        message="No weather forecast records found.",
        latest=latest,
    )


def _check_weather_missing_values(db: Session, *, country: str, zone: str) -> DataQualityCheck:
    missing_count = count_null_weather_values(db, country_code=country, zone=zone)

    if missing_count == 0:
        return _weather_check(
            name="Weather missing values",
            status="OK",
            severity="low",
            message="No missing core weather values found.",
        )

    return _weather_check(
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
        return _weather_check(
            name="Weather duplicate timestamps",
            status="OK",
            severity="low",
            message="No duplicate weather timestamps found.",
        )

    return _weather_check(
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
        return _weather_check(
            name="Weather freshness",
            status="FAILED",
            severity="high",
            message="No weather timestamp found.",
        )

    # Weather forecast target time may be in the future.
    # Negative age means the forecast extends ahead of current time.
    if age_hours <= 6:
        return _weather_check(
            name="Weather freshness",
            status="OK",
            severity="low",
            message=f"Weather forecast is current. Latest target is {age_hours:.1f} hours old.",
        )

    return _weather_check(
        name="Weather freshness",
        status="WARNING",
        severity="medium",
        message=f"Latest weather forecast target is stale: {age_hours:.1f} hours old.",
    )


def _price_check(
    *,
    name: str,
    status: str,
    severity: str,
    message: str,
    latest=None,
) -> DataQualityCheck:
    return DataQualityCheck(
        name=name,
        status=status,
        severity=severity,
        message=message,
        table="market_prices",
        source="database",
        latest_timestamp_utc=latest.isoformat() if latest else None,
        expected="At least 24 recent day-ahead price records with no nulls or duplicate timestamps.",
        repair_command=PRICE_REPAIR_COMMAND,
        fallback_used=status != "OK",
    )


def _weather_check(
    *,
    name: str,
    status: str,
    severity: str,
    message: str,
    latest=None,
) -> DataQualityCheck:
    return DataQualityCheck(
        name=name,
        status=status,
        severity=severity,
        message=message,
        table="weather_forecasts",
        source="database",
        latest_timestamp_utc=latest.isoformat() if latest else None,
        expected="At least 24 recent forecast records with temperature, wind, and radiation values.",
        repair_command=WEATHER_REPAIR_COMMAND,
        fallback_used=status != "OK",
    )


def _derive_overall_status(checks: list[DataQualityCheck]) -> str:
    if any(check.status == "FAILED" for check in checks):
        return "FAILED"

    if any(check.status == "WARNING" for check in checks):
        return "WARNING"

    return "OK"
