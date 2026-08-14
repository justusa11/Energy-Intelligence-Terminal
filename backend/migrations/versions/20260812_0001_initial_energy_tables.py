"""Initial energy data tables.

Revision ID: 20260812_0001
Revises: None
Create Date: 2026-08-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260812_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ingestion_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=100), nullable=False),
        sa.Column("dataset", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("rows_fetched", sa.Integer(), nullable=False),
        sa.Column("rows_inserted", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ingestion_logs_id"), "ingestion_logs", ["id"], unique=False)
    op.create_index(op.f("ix_ingestion_logs_source"), "ingestion_logs", ["source"], unique=False)
    op.create_index(op.f("ix_ingestion_logs_dataset"), "ingestion_logs", ["dataset"], unique=False)
    op.create_index(op.f("ix_ingestion_logs_status"), "ingestion_logs", ["status"], unique=False)

    op.create_table(
        "market_prices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("country_code", sa.String(length=10), nullable=False),
        sa.Column("market", sa.String(length=50), nullable=False),
        sa.Column("zone", sa.String(length=50), nullable=False),
        sa.Column("source", sa.String(length=100), nullable=False),
        sa.Column("timestamp_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("local_timestamp", sa.DateTime(timezone=False), nullable=True),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "country_code",
            "market",
            "zone",
            "source",
            "timestamp_utc",
            name="uq_market_price_unique_timestamp",
        ),
    )
    op.create_index(op.f("ix_market_prices_id"), "market_prices", ["id"], unique=False)
    op.create_index(op.f("ix_market_prices_country_code"), "market_prices", ["country_code"], unique=False)
    op.create_index(op.f("ix_market_prices_market"), "market_prices", ["market"], unique=False)
    op.create_index(op.f("ix_market_prices_zone"), "market_prices", ["zone"], unique=False)
    op.create_index(op.f("ix_market_prices_source"), "market_prices", ["source"], unique=False)
    op.create_index(op.f("ix_market_prices_timestamp_utc"), "market_prices", ["timestamp_utc"], unique=False)

    op.create_table(
        "weather_forecasts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("country_code", sa.String(length=10), nullable=False),
        sa.Column("zone", sa.String(length=50), nullable=False),
        sa.Column("source", sa.String(length=100), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("forecast_issue_time_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("target_time_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("temperature_2m_c", sa.Float(), nullable=True),
        sa.Column("wind_speed_10m_ms", sa.Float(), nullable=True),
        sa.Column("wind_speed_100m_ms", sa.Float(), nullable=True),
        sa.Column("shortwave_radiation_wm2", sa.Float(), nullable=True),
        sa.Column("precipitation_mm", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "country_code",
            "zone",
            "source",
            "target_time_utc",
            name="uq_weather_forecast_unique_target_time",
        ),
    )
    op.create_index(op.f("ix_weather_forecasts_id"), "weather_forecasts", ["id"], unique=False)
    op.create_index(op.f("ix_weather_forecasts_country_code"), "weather_forecasts", ["country_code"], unique=False)
    op.create_index(op.f("ix_weather_forecasts_zone"), "weather_forecasts", ["zone"], unique=False)
    op.create_index(op.f("ix_weather_forecasts_source"), "weather_forecasts", ["source"], unique=False)
    op.create_index(
        op.f("ix_weather_forecasts_forecast_issue_time_utc"),
        "weather_forecasts",
        ["forecast_issue_time_utc"],
        unique=False,
    )
    op.create_index(op.f("ix_weather_forecasts_target_time_utc"), "weather_forecasts", ["target_time_utc"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_weather_forecasts_target_time_utc"), table_name="weather_forecasts")
    op.drop_index(op.f("ix_weather_forecasts_forecast_issue_time_utc"), table_name="weather_forecasts")
    op.drop_index(op.f("ix_weather_forecasts_source"), table_name="weather_forecasts")
    op.drop_index(op.f("ix_weather_forecasts_zone"), table_name="weather_forecasts")
    op.drop_index(op.f("ix_weather_forecasts_country_code"), table_name="weather_forecasts")
    op.drop_index(op.f("ix_weather_forecasts_id"), table_name="weather_forecasts")
    op.drop_table("weather_forecasts")

    op.drop_index(op.f("ix_market_prices_timestamp_utc"), table_name="market_prices")
    op.drop_index(op.f("ix_market_prices_source"), table_name="market_prices")
    op.drop_index(op.f("ix_market_prices_zone"), table_name="market_prices")
    op.drop_index(op.f("ix_market_prices_market"), table_name="market_prices")
    op.drop_index(op.f("ix_market_prices_country_code"), table_name="market_prices")
    op.drop_index(op.f("ix_market_prices_id"), table_name="market_prices")
    op.drop_table("market_prices")

    op.drop_index(op.f("ix_ingestion_logs_status"), table_name="ingestion_logs")
    op.drop_index(op.f("ix_ingestion_logs_dataset"), table_name="ingestion_logs")
    op.drop_index(op.f("ix_ingestion_logs_source"), table_name="ingestion_logs")
    op.drop_index(op.f("ix_ingestion_logs_id"), table_name="ingestion_logs")
    op.drop_table("ingestion_logs")
