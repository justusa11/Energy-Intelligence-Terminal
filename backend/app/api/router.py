from fastapi import APIRouter
from app.api.v1 import health, market, prices, risk, weather

# ROUTER
api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(market.router, prefix="/market", tags=["Market"])
api_router.include_router(prices.router, prefix="/prices", tags=["Prices"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather"])
api_router.include_router(risk.router, prefix="/risk", tags=["Risk"])