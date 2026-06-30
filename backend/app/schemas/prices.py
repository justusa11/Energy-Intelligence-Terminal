from pydantic import BaseModel

class HourlyPrice(BaseModel):
    hour: str
    price_eur_mwh: float

class DayAheadPricesResponse(BaseModel):
    country: str
    zone: str
    market: str
    unit: str
    prices: list[HourlyPrice]