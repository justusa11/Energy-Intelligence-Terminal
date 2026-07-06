from pydantic import BaseModel


class ZoneInfo(BaseModel):
    code: str
    name: str
    data_mode: str
    currency: str


class CountryInfo(BaseModel):
    code: str
    name: str
    timezone: str
    zones: list[ZoneInfo]


class CountriesResponse(BaseModel):
    countries: list[CountryInfo]
