from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(PROJECT_ROOT))

from app.db.session import SessionLocal
from app.models.ingestion_log import IngestionLog


def write_system_heartbeat() -> dict[str, object]:
    started_at = datetime.now(timezone.utc)
    source = os.getenv("HEARTBEAT_SOURCE", "docker_practice")
    db = SessionLocal()

    try:
        db.execute(text("SELECT 1"))
        db.add(
            IngestionLog(
                source=source,
                dataset="system_heartbeat",
                status="success",
                rows_fetched=1,
                rows_inserted=1,
                message="Practice heartbeat wrote and read the app database successfully.",
                started_at=started_at,
                finished_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
        return {
            "status": "success",
            "dataset": "system_heartbeat",
            "rows_fetched": 1,
            "rows_inserted": 1,
        }
    finally:
        db.close()


if __name__ == "__main__":
    print(write_system_heartbeat())
