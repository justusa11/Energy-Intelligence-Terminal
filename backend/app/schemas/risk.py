from pydantic import BaseModel


class RiskCheck(BaseModel):
    name: str
    status: str
    severity: str


class RiskStatusResponse(BaseModel):
    status: str
    checks: list[RiskCheck]