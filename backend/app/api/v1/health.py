from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "energy-intelligence-terminal-api",
        "version": "0.1.0",
    }