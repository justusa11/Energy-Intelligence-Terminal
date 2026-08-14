import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from app.api.router import api_router
from app.core.observability import configure_logging, request_id_middleware
from app.core.security import api_auth_middleware

DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
configure_logging()


def get_cors_origins() -> list[str]:
    raw_origins = os.getenv("BACKEND_CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


app = FastAPI(
    title="Energy Intelligence Terminal API",
    version="0.1.0",
    description="Backend API for the AI Energy Intelligence Terminal",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(request_id_middleware)
app.middleware("http")(api_auth_middleware)

app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=503,
        content={
            "error": {
                "code": "database_error",
                "message": "Database operation failed.",
                "path": request.url.path,
                "repair_hint": "Check database connectivity and run python -m alembic upgrade head.",
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_error",
                "message": "Unexpected backend error.",
                "path": request.url.path,
            }
        },
    )

@app.get("/")
def root():
    return {
        "message": "Energy Intelligence Terminal API is running",
        "docs": "/docs",
        "version": "0.1.0",
    }

@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
