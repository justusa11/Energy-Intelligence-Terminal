from fastapi import FastAPI

app = FastAPI(
    title="Energy Intelligence Terminal API",
    version="0.1.0",
)

@app.get("/")
def root():
    return {"message": "Energy Intelligence Terminal API is running"}

@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
