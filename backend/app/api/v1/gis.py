from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.infrastructure_repository import (
    get_infrastructure_asset_by_id,
    get_infrastructure_assets,
    get_infrastructure_links_for_asset,
    get_infrastructure_links,
)
from app.services.market_context_service import build_market_context

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


@router.get("/assets/{asset_id}/context")
def gis_asset_context(
    asset_id: str,
    db: Session = Depends(get_db),
):
    asset = get_infrastructure_asset_by_id(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail=f"Infrastructure asset '{asset_id}' was not found.")

    zone = asset.zone or asset.country_code
    market_context = build_market_context(db, country=asset.country_code, zone=zone)
    related_links = [serialize_link(link) for link in get_infrastructure_links_for_asset(db, asset.asset_id)]
    serialized_asset = serialize_asset(asset)
    primary_driver = max(market_context.drivers, key=lambda driver: driver.score)

    return {
        "asset": serialized_asset,
        "headline": _asset_headline(asset, market_context.context_level),
        "what_is_happening": _what_is_happening(asset, primary_driver),
        "why_it_matters": _why_it_matters(asset, primary_driver, related_links),
        "operator_actions": _asset_actions(asset, market_context.recommended_actions, related_links),
        "risk": {
            "level": market_context.context_level,
            "driver": market_context.dominant_driver,
            "confidence": market_context.confidence,
        },
        "market_context": market_context.model_dump(),
        "related_links": related_links,
        "data_sources": {
            **market_context.data_sources,
            "asset_registry": asset.source,
        },
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


def _asset_headline(asset, context_level: str) -> str:
    if asset.asset_type == "market_zone":
        return f"{asset.name} is in {context_level} market context."
    if asset.capacity_mw:
        return f"{asset.name} contributes {asset.capacity_mw:.0f} MW of mapped {asset.fuel_type or asset.asset_type} capacity."
    return f"{asset.name} is mapped as {asset.asset_type.replace('_', ' ')} infrastructure."


def _what_is_happening(asset, primary_driver) -> str:
    return (
        f"{primary_driver.label} is the strongest current signal for {asset.zone or asset.country_code}. "
        f"{primary_driver.explanation}"
    )


def _why_it_matters(asset, primary_driver, related_links: list[dict]) -> str:
    linked = len(related_links)
    if asset.asset_type == "market_zone":
        return (
            f"This zone anchors local price, load, and congestion decisions. "
            f"{linked} mapped corridor{'s' if linked != 1 else ''} connect to the selected asset."
        )
    if asset.fuel_type == "wind":
        return "Wind output changes the residual load shape and can create storage or export opportunities."
    if asset.fuel_type in {"gas", "lignite", "coal"}:
        return "Dispatchable thermal capacity can set marginal prices when renewable output is low or demand is high."
    if asset.fuel_type == "nuclear":
        return "Large nuclear units create availability sensitivity because outages remove substantial baseload capacity."
    if asset.asset_type == "lng_terminal":
        return "Fuel infrastructure affects gas-to-power economics and thermal dispatch security."
    return primary_driver.explanation


def _asset_actions(asset, context_actions: list[str], related_links: list[dict]) -> list[str]:
    actions = list(context_actions[:3])
    if related_links:
        actions.append("Review related corridors for congestion, capacity, and cross-border price-spread exposure.")
    if asset.asset_type == "market_zone":
        actions.append("Compare cheap and expensive hours before dispatching flexible load or storage.")
    elif asset.capacity_mw:
        actions.append("Check whether this asset changes residual load, reserve margin, or local congestion exposure.")
    return actions[:5]
