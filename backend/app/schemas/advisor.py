from pydantic import BaseModel


class AdvisorQuestion(BaseModel):
    question: str
    country: str = "DK"
    zone: str = "DK1"


class AdvisorAnswer(BaseModel):
    question: str
    answer: str
    sources: list[str]
    suggested_questions: list[str]
