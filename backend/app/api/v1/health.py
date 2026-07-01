from fastapi import APIRouter

from app.db.init_db import init_db

router = APIRouter()

@router.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "energy-intelligence-terminal-api",
        "version": "0.1.0",
    }

@router.post("/init-db")
def initialize_database():
    init_db()
    return {
        "status": "ok",
        "message": "Database tables initialized",
    }