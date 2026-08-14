from pydantic import BaseModel

class HourlyPrice(BaseModel):
    hour: str
    timestamp_utc: str
    price_eur_mwh: float

class DayAheadPricesResponse(BaseModel):
    country: str
    zone: str
    market: str
    unit: str
    data_source: str | None = None
    prices: list[HourlyPrice]
