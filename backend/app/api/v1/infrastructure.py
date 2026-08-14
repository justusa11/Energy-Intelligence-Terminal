from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.gis import serialize_asset, serialize_link
from app.db.session import get_db
from app.repositories.infrastructure_repository import (
    get_infrastructure_assets,
    get_infrastructure_links,
    summarize_capacity_by_fuel,
)

router = APIRouter()


@router.get("/summary")
def infrastructure_summary(
    region: str = Query(default="europe"),
    db: Session = Depends(get_db),
):
    assets = get_infrastructure_assets(db, region=region, asset_type="all", limit=5000)
    links = get_infrastructure_links(db, region=region)
    countries = sorted({asset.country_code for asset in assets})
    zones = sorted({asset.zone for asset in assets if asset.zone})
    return {
        "region": region,
        "asset_count": len(assets),
        "corridor_count": len(links),
        "countries": countries,
        "market_zones": zones,
        "capacity_by_fuel_mw": summarize_capacity_by_fuel(assets),
        "total_capacity_mw": round(sum(asset.capacity_mw or 0 for asset in assets), 1),
        "largest_assets": [serialize_asset(asset) for asset in assets[:10]],
        "interconnectors": [serialize_link(link) for link in links],
        "data_source": "infrastructure_database",
    }
