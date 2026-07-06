from pydantic import BaseModel

class DataQualityCheck(BaseModel):
    name: str
    status: str
    severity: str
    message: str

class DataQualityResponse(BaseModel):
    country: str
    zone: str
    status: str
    checks: list[DataQualityCheck]

