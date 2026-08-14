from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.infrastructure_repository import (
    get_infrastructure_assets,
    get_infrastructure_links,
)

router = APIRouter()


@router.get("/assets")
def gis_assets(
    asset_type: str | None = Query(default=None),
    region: str = Query(default="europe"),
    country: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    records = get_infrastructure_assets(
        db,
        region=region,
        asset_type=asset_type,
        country=country,
    )
    assets = [serialize_asset(asset) for asset in records]
    visible_ids = {asset["id"] for asset in assets}
    links = [
        serialize_link(link)
        for link in get_infrastructure_links(db, region=region)
        if link.from_asset_id in visible_ids or link.to_asset_id in visible_ids
    ]
    data_source = (
        "curated_global_fleet"
        if region == "global" and assets
        else "seeded_european_fleet"
        if assets
        else "infrastructure_database"
    )
    return {
        "region": region,
        "data_source": data_source,
        "assets": assets,
        "links": links,
    }


def serialize_asset(asset):
    return {
        "id": asset.asset_id,
        "name": asset.name,
        "type": asset.asset_type,
        "lon": asset.longitude,
        "lat": asset.latitude,
        "detail": asset.detail or "",
        "country": asset.country_code,
        "zone": asset.zone,
        "capacity_mw": asset.capacity_mw,
        "fuel_type": asset.fuel_type,
        "technology": asset.technology,
        "operator": asset.operator,
        "status": asset.status,
        "source": asset.source,
        "source_year": asset.source_year,
    }


def serialize_link(link):
    return {
        "id": link.link_id,
        "name": link.name,
        "from_asset_id": link.from_asset_id,
        "to_asset_id": link.to_asset_id,
        "capacity_mw": link.capacity_mw,
        "detail": link.detail,
        "source": link.source,
    }
