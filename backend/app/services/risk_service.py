from app.schemas.risk import RiskCheck, RiskStatusResponse


def get_risk_status() -> RiskStatusResponse:
    return RiskStatusResponse(
        status="SAFE",
        checks=[
            RiskCheck(name="Price data freshness", status="OK", severity="low"),
            RiskCheck(name="Weather data freshness", status="OK", severity="low"),
            RiskCheck(name="Forecast confidence", status="OK", severity="low"),
            RiskCheck(name="Comfort constraints", status="OK", severity="low"),
        ],
    )