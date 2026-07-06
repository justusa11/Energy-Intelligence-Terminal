from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.advisor import AdvisorAnswer, AdvisorQuestion
from app.services.advisor_service import SUGGESTED_QUESTIONS, answer_question

router = APIRouter()


@router.post("/ask", response_model=AdvisorAnswer)
def ask_advisor(payload: AdvisorQuestion, db: Session = Depends(get_db)):
    return answer_question(
        db,
        question=payload.question,
        country=payload.country,
        zone=payload.zone,
    )


@router.get("/suggested-questions")
def suggested_questions():
    return {"questions": SUGGESTED_QUESTIONS}
