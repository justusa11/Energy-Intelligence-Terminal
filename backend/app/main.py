from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router

app = FastAPI(
    title="Energy Intelligence Terminal API",
    version="0.1.0",
    description="Backend API for the AI Energy Intelligence Terminal",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

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
