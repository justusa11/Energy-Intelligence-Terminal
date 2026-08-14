from fastapi import APIRouter
from app.api.v1 import (
    advisor,
    context,
    derivatives,
    flexibility,
    forecast,
    gas_carbon,
    gis,
    health,
    infrastructure,
    market,
    market_events,
    prices,
    reports,
    risk,
    screener,
    simulator,
    weather,
)

# ROUTER
api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(market.router, prefix="/market", tags=["Market"])
api_router.include_router(market_events.router, prefix="/market-events", tags=["Market Events"])
api_router.include_router(context.router, prefix="/context", tags=["Market Context"])
api_router.include_router(prices.router, prefix="/prices", tags=["Prices"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather"])
api_router.include_router(risk.router, prefix="/risk", tags=["Risk"])
api_router.include_router(forecast.router, prefix="/forecast", tags=["Forecast"])
api_router.include_router(screener.router, prefix="/screener", tags=["Screener"])
api_router.include_router(flexibility.router, prefix="/flexibility", tags=["Flexibility"])
api_router.include_router(simulator.router, prefix="/simulator", tags=["Simulator"])
api_router.include_router(advisor.router, prefix="/advisor", tags=["AI Advisor"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(derivatives.router, prefix="/derivatives", tags=["Derivatives"])
api_router.include_router(gas_carbon.router, prefix="/gas-carbon", tags=["Gas & Carbon"])
api_router.include_router(gis.router, prefix="/gis", tags=["GIS"])
api_router.include_router(infrastructure.router, prefix="/infrastructure", tags=["Infrastructure"])
