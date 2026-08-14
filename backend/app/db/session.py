from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

connect_args = {}
if settings.database_url.startswith(("postgresql://", "postgresql+")):
    connect_args["connect_timeout"] = 3

# ENGINE
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_timeout=3,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
