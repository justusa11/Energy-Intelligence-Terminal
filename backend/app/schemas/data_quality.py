from pydantic import BaseModel

class DataQualityCheck(BaseModel):
    name: str
    status: str
    severity: str
    message: str
    table: str | None = None
    source: str | None = None
    latest_timestamp_utc: str | None = None
    expected: str | None = None
    repair_command: str | None = None
    fallback_used: bool = False

class DataQualityResponse(BaseModel):
    country: str
    zone: str
    status: str
    checks: list[DataQualityCheck]

