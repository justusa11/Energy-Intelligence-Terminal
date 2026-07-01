from app.db.base import Base
from app.db.session import engine

# IMPORT MODELS SO SQLALchemy registers them
from app.models.market_price import MarketPrice # noqa: F401
from app.models.ingestion_log import IngestionLog # noqa: F401

def init_db():
    Base.metadata.create_all(bind=engine)