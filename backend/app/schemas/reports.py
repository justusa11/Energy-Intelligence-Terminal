from datetime import datetime

from pydantic import BaseModel


class ReportSection(BaseModel):
    title: str
    body: str


class ReportResponse(BaseModel):
    report_type: str  # daily | weekly_savings
    country: str
    zone: str
    generated_at_utc: datetime
    title: str
    markdown: str
    sections: list[ReportSection]
