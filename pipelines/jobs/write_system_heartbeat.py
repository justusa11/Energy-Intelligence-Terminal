from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"

sys.path.append(str(BACKEND_ROOT))
sys.path.append(str(PROJECT_ROOT))

from app.db.session import SessionLocal
from app.models.ingestion_log import IngestionLog


def write_system_heartbeat() -> dict[str, object]:
    started_at = datetime.now(timezone.utc)
    db = SessionLocal()

    try:
        db.execute(text("SELECT 1")).scalar()
        db.add(
            IngestionLog(
                source=os.getenv("HEARTBEAT_SOURCE", "practice_scheduler"),
                dataset="system_heartbeat",
                status="success",
                rows_fetched=1,
                rows_inserted=1,
                message="Practice heartbeat wrote a tiny database activity record.",
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
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print(write_system_heartbeat())
