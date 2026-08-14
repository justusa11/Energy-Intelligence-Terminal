from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.db.session import engine

BACKEND_ROOT = Path(__file__).resolve().parents[1]
CORE_TABLES = {"ingestion_logs", "market_prices", "weather_forecasts"}
INFRA_TABLES = {"energy_market_marks", "infrastructure_assets", "infrastructure_links"}
INITIAL_REVISION = "20260812_0001"
HEAD_REVISION = "head"


def bootstrap_schema() -> None:
    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    if "alembic_version" not in tables and CORE_TABLES <= tables:
        revision = HEAD_REVISION if INFRA_TABLES <= tables else INITIAL_REVISION
        command.stamp(cfg, revision)

    command.upgrade(cfg, HEAD_REVISION)


if __name__ == "__main__":
    bootstrap_schema()
