import argparse
import csv
import hashlib
from pathlib import Path

from app.db.session import SessionLocal
from app.repositories.infrastructure_repository import upsert_infrastructure_assets


FIELD_ALIASES = {
    "name": ["name", "Name", "projectID", "project_name"],
    "country_code": ["country_code", "country", "Country", "ISO2"],
    "latitude": ["latitude", "lat", "Lat", "Latitude"],
    "longitude": ["longitude", "lon", "lng", "Long", "Longitude"],
    "capacity_mw": ["capacity_mw", "capacity", "Capacity", "Capacity_Net_Bnetza", "electrical_capacity"],
    "fuel_type": ["fuel_type", "energy_source", "Fueltype", "Fuel", "fuel"],
    "technology": ["technology", "Technology", "Set", "type"],
    "operator": ["operator", "company", "Operator", "owner"],
    "status": ["status", "Status"],
    "zone": ["zone", "bidding_zone", "market_zone"],
    "source": ["source", "Source"],
}


def pick(row: dict[str, str], field: str, default: str | None = None) -> str | None:
    for key in FIELD_ALIASES[field]:
        value = row.get(key)
        if value not in (None, ""):
            return value.strip()
    return default


def parse_float(value: str | None) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value.replace(",", "."))
    except ValueError:
        return None


def build_asset_id(country_code: str, name: str, latitude: float, longitude: float) -> str:
    slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in name).strip("-")
    digest = hashlib.sha1(f"{country_code}|{name}|{latitude}|{longitude}".encode("utf-8")).hexdigest()[:8]
    return f"{country_code.lower()}-{slug[:60]}-{digest}"


def read_assets(path: Path, *, source_year: int | None) -> list[dict]:
    assets = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            name = pick(row, "name")
            country_code = pick(row, "country_code")
            latitude = parse_float(pick(row, "latitude"))
            longitude = parse_float(pick(row, "longitude"))
            capacity_mw = parse_float(pick(row, "capacity_mw"))
            if not name or not country_code or latitude is None or longitude is None:
                continue
            fuel_type = (pick(row, "fuel_type", "unknown") or "unknown").lower()
            technology = pick(row, "technology")
            zone = pick(row, "zone", country_code.upper())
            source = pick(row, "source", path.stem)
            assets.append(
                {
                    "asset_id": build_asset_id(country_code.upper(), name, latitude, longitude),
                    "name": name,
                    "asset_type": "power_plant",
                    "region": "europe",
                    "country_code": country_code.upper(),
                    "zone": zone,
                    "latitude": latitude,
                    "longitude": longitude,
                    "capacity_mw": capacity_mw,
                    "fuel_type": fuel_type,
                    "technology": technology,
                    "operator": pick(row, "operator"),
                    "status": pick(row, "status", "unknown"),
                    "detail": f"{fuel_type} {technology or 'generation asset'}".strip(),
                    "source": source or path.stem,
                    "source_year": source_year,
                }
            )
    return assets


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest European power plant CSV into infrastructure assets.")
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--source-year", type=int, default=None)
    args = parser.parse_args()

    assets = read_assets(args.csv_path, source_year=args.source_year)
    db = SessionLocal()
    try:
        inserted, updated = upsert_infrastructure_assets(db, assets)
    finally:
        db.close()
    print({"rows_read": len(assets), "rows_inserted": inserted, "rows_updated": updated})


if __name__ == "__main__":
    main()
