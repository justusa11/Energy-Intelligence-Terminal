from collections import defaultdict
from typing import Iterable

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.data.european_infrastructure_seed import GLOBAL_LINKS, GLOBAL_POWER_PLANTS
from app.models.infrastructure_asset import InfrastructureAsset, InfrastructureLink


def seed_european_infrastructure(db: Session) -> None:
    changed = False
    for item in GLOBAL_POWER_PLANTS:
        if (
            db.query(InfrastructureAsset)
            .filter(InfrastructureAsset.asset_id == item["asset_id"])
            .one_or_none()
            is not None
        ):
            continue

        asset_type = item.get("asset_type", "power_plant")
        capacity = item.get("capacity_mw")
        detail = item.get("detail")
        if detail is None and capacity is not None:
            detail = f"{item['fuel_type']} {item['technology']}, {capacity:.0f} MW"

        db.add(
            InfrastructureAsset(
                asset_type=asset_type,
                region=item.get("region", "europe"),
                source=item.get("source", "curated_seed_open_references"),
                source_year=item.get("source_year", 2026),
                detail=detail,
                **{
                    key: value
                    for key, value in item.items()
                    if key not in {"asset_type", "region", "source", "source_year", "detail"}
                },
            )
        )
        changed = True

    for item in GLOBAL_LINKS:
        if (
            db.query(InfrastructureLink)
            .filter(InfrastructureLink.link_id == item["link_id"])
            .one_or_none()
            is not None
        ):
            continue
        db.add(
            InfrastructureLink(
                region=item.get("region", "europe"),
                source=item.get("source", "curated_seed_open_references"),
                **{
                    key: value
                    for key, value in item.items()
                    if key not in {"region", "source"}
                },
            )
        )
        changed = True
    if changed:
        db.commit()


def upsert_infrastructure_assets(db: Session, assets: Iterable[dict]) -> tuple[int, int]:
    inserted = 0
    updated = 0
    for item in assets:
        existing = (
            db.query(InfrastructureAsset)
            .filter(InfrastructureAsset.asset_id == item["asset_id"])
            .one_or_none()
        )
        if existing is None:
            db.add(InfrastructureAsset(**item))
            inserted += 1
        else:
            for key, value in item.items():
                setattr(existing, key, value)
            updated += 1
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    return inserted, updated


def get_infrastructure_assets(
    db: Session,
    *,
    region: str = "europe",
    asset_type: str | None = None,
    country: str | None = None,
    limit: int = 2000,
) -> list[InfrastructureAsset]:
    seed_european_infrastructure(db)
    query = db.query(InfrastructureAsset)
    if region != "global":
        query = query.filter(InfrastructureAsset.region == region)
    if asset_type not in (None, "all"):
        query = query.filter(InfrastructureAsset.asset_type == asset_type)
    if country not in (None, "all"):
        query = query.filter(InfrastructureAsset.country_code == country)
    return (
        query.order_by(
            InfrastructureAsset.asset_type.asc(),
            InfrastructureAsset.capacity_mw.desc().nullslast(),
            InfrastructureAsset.name.asc(),
        )
        .limit(limit)
        .all()
    )


def get_infrastructure_asset_by_id(db: Session, asset_id: str) -> InfrastructureAsset | None:
    seed_european_infrastructure(db)
    return (
        db.query(InfrastructureAsset)
        .filter(InfrastructureAsset.asset_id == asset_id)
        .one_or_none()
    )


def get_infrastructure_links(db: Session, *, region: str = "europe") -> list[InfrastructureLink]:
    seed_european_infrastructure(db)
    query = db.query(InfrastructureLink)
    if region != "global":
        query = query.filter(InfrastructureLink.region == region)
    return query.order_by(InfrastructureLink.name.asc()).all()


def get_infrastructure_links_for_asset(db: Session, asset_id: str) -> list[InfrastructureLink]:
    seed_european_infrastructure(db)
    return (
        db.query(InfrastructureLink)
        .filter(
            (InfrastructureLink.from_asset_id == asset_id)
            | (InfrastructureLink.to_asset_id == asset_id)
        )
        .order_by(InfrastructureLink.capacity_mw.desc().nullslast(), InfrastructureLink.name.asc())
        .all()
    )


def summarize_capacity_by_fuel(assets: Iterable[InfrastructureAsset]) -> dict[str, float]:
    totals: defaultdict[str, float] = defaultdict(float)
    for asset in assets:
        if asset.asset_type != "power_plant" or not asset.fuel_type:
            continue
        totals[asset.fuel_type] += asset.capacity_mw or 0
    return {fuel: round(value, 1) for fuel, value in sorted(totals.items())}
