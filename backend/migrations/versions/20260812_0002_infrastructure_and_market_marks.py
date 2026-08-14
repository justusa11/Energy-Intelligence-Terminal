"""Infrastructure and fuel market marks.

Revision ID: 20260812_0002
Revises: 20260812_0001
Create Date: 2026-08-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260812_0002"
down_revision: Union[str, None] = "20260812_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "energy_market_marks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("country_code", sa.String(length=10), nullable=False),
        sa.Column("zone", sa.String(length=50), nullable=False),
        sa.Column("instrument", sa.String(length=80), nullable=False),
        sa.Column("unit", sa.String(length=30), nullable=False),
        sa.Column("source", sa.String(length=120), nullable=False),
        sa.Column("timestamp_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "country_code",
            "zone",
            "instrument",
            "source",
            "timestamp_utc",
            name="uq_energy_market_mark_unique_timestamp",
        ),
    )
    op.create_index(op.f("ix_energy_market_marks_id"), "energy_market_marks", ["id"], unique=False)
    op.create_index(op.f("ix_energy_market_marks_country_code"), "energy_market_marks", ["country_code"], unique=False)
    op.create_index(op.f("ix_energy_market_marks_zone"), "energy_market_marks", ["zone"], unique=False)
    op.create_index(op.f("ix_energy_market_marks_instrument"), "energy_market_marks", ["instrument"], unique=False)
    op.create_index(op.f("ix_energy_market_marks_source"), "energy_market_marks", ["source"], unique=False)
    op.create_index(op.f("ix_energy_market_marks_timestamp_utc"), "energy_market_marks", ["timestamp_utc"], unique=False)

    op.create_table(
        "infrastructure_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("asset_type", sa.String(length=50), nullable=False),
        sa.Column("region", sa.String(length=50), nullable=False),
        sa.Column("country_code", sa.String(length=10), nullable=False),
        sa.Column("zone", sa.String(length=50), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("capacity_mw", sa.Float(), nullable=True),
        sa.Column("fuel_type", sa.String(length=80), nullable=True),
        sa.Column("technology", sa.String(length=120), nullable=True),
        sa.Column("operator", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=80), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=120), nullable=False),
        sa.Column("source_year", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("asset_id"),
    )
    op.create_index(op.f("ix_infrastructure_assets_id"), "infrastructure_assets", ["id"], unique=False)
    op.create_index(op.f("ix_infrastructure_assets_asset_id"), "infrastructure_assets", ["asset_id"], unique=False)
    op.create_index(op.f("ix_infrastructure_assets_name"), "infrastructure_assets", ["name"], unique=False)
    op.create_index(op.f("ix_infrastructure_assets_asset_type"), "infrastructure_assets", ["asset_type"], unique=False)
    op.create_index(op.f("ix_infrastructure_assets_region"), "infrastructure_assets", ["region"], unique=False)
    op.create_index(op.f("ix_infrastructure_assets_country_code"), "infrastructure_assets", ["country_code"], unique=False)
    op.create_index(op.f("ix_infrastructure_assets_zone"), "infrastructure_assets", ["zone"], unique=False)
    op.create_index(op.f("ix_infrastructure_assets_fuel_type"), "infrastructure_assets", ["fuel_type"], unique=False)
    op.create_index(op.f("ix_infrastructure_assets_status"), "infrastructure_assets", ["status"], unique=False)
    op.create_index(op.f("ix_infrastructure_assets_source"), "infrastructure_assets", ["source"], unique=False)

    op.create_table(
        "infrastructure_links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("link_id", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("link_type", sa.String(length=80), nullable=False),
        sa.Column("region", sa.String(length=50), nullable=False),
        sa.Column("from_asset_id", sa.String(length=120), nullable=False),
        sa.Column("to_asset_id", sa.String(length=120), nullable=False),
        sa.Column("capacity_mw", sa.Float(), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("link_id"),
        sa.UniqueConstraint("from_asset_id", "to_asset_id", "link_type", name="uq_infrastructure_link_pair"),
    )
    op.create_index(op.f("ix_infrastructure_links_id"), "infrastructure_links", ["id"], unique=False)
    op.create_index(op.f("ix_infrastructure_links_link_id"), "infrastructure_links", ["link_id"], unique=False)
    op.create_index(op.f("ix_infrastructure_links_name"), "infrastructure_links", ["name"], unique=False)
    op.create_index(op.f("ix_infrastructure_links_link_type"), "infrastructure_links", ["link_type"], unique=False)
    op.create_index(op.f("ix_infrastructure_links_region"), "infrastructure_links", ["region"], unique=False)
    op.create_index(op.f("ix_infrastructure_links_from_asset_id"), "infrastructure_links", ["from_asset_id"], unique=False)
    op.create_index(op.f("ix_infrastructure_links_to_asset_id"), "infrastructure_links", ["to_asset_id"], unique=False)
    op.create_index(op.f("ix_infrastructure_links_source"), "infrastructure_links", ["source"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_infrastructure_links_source"), table_name="infrastructure_links")
    op.drop_index(op.f("ix_infrastructure_links_to_asset_id"), table_name="infrastructure_links")
    op.drop_index(op.f("ix_infrastructure_links_from_asset_id"), table_name="infrastructure_links")
    op.drop_index(op.f("ix_infrastructure_links_region"), table_name="infrastructure_links")
    op.drop_index(op.f("ix_infrastructure_links_link_type"), table_name="infrastructure_links")
    op.drop_index(op.f("ix_infrastructure_links_name"), table_name="infrastructure_links")
    op.drop_index(op.f("ix_infrastructure_links_link_id"), table_name="infrastructure_links")
    op.drop_index(op.f("ix_infrastructure_links_id"), table_name="infrastructure_links")
    op.drop_table("infrastructure_links")

    op.drop_index(op.f("ix_infrastructure_assets_source"), table_name="infrastructure_assets")
    op.drop_index(op.f("ix_infrastructure_assets_status"), table_name="infrastructure_assets")
    op.drop_index(op.f("ix_infrastructure_assets_fuel_type"), table_name="infrastructure_assets")
    op.drop_index(op.f("ix_infrastructure_assets_zone"), table_name="infrastructure_assets")
    op.drop_index(op.f("ix_infrastructure_assets_country_code"), table_name="infrastructure_assets")
    op.drop_index(op.f("ix_infrastructure_assets_region"), table_name="infrastructure_assets")
    op.drop_index(op.f("ix_infrastructure_assets_asset_type"), table_name="infrastructure_assets")
    op.drop_index(op.f("ix_infrastructure_assets_name"), table_name="infrastructure_assets")
    op.drop_index(op.f("ix_infrastructure_assets_asset_id"), table_name="infrastructure_assets")
    op.drop_index(op.f("ix_infrastructure_assets_id"), table_name="infrastructure_assets")
    op.drop_table("infrastructure_assets")

    op.drop_index(op.f("ix_energy_market_marks_timestamp_utc"), table_name="energy_market_marks")
    op.drop_index(op.f("ix_energy_market_marks_source"), table_name="energy_market_marks")
    op.drop_index(op.f("ix_energy_market_marks_instrument"), table_name="energy_market_marks")
    op.drop_index(op.f("ix_energy_market_marks_zone"), table_name="energy_market_marks")
    op.drop_index(op.f("ix_energy_market_marks_country_code"), table_name="energy_market_marks")
    op.drop_index(op.f("ix_energy_market_marks_id"), table_name="energy_market_marks")
    op.drop_table("energy_market_marks")
