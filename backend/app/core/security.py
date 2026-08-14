import hmac
import os

from fastapi import Request
from fastapi.responses import JSONResponse

OPEN_PATH_PREFIXES = (
    "/",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/health",
)


def is_open_path(path: str) -> bool:
    if path == "/":
        return True
    return any(path == prefix or path.startswith(f"{prefix}/") for prefix in OPEN_PATH_PREFIXES if prefix != "/")


async def api_auth_middleware(request: Request, call_next):
    expected_token = os.getenv("APP_AUTH_TOKEN")
    if not expected_token or request.method == "OPTIONS" or is_open_path(request.url.path):
        return await call_next(request)

    auth_header = request.headers.get("authorization", "")
    scheme, _, provided_token = auth_header.partition(" ")
    is_valid = scheme.lower() == "bearer" and hmac.compare_digest(provided_token, expected_token)
    if not is_valid:
        return JSONResponse(
            status_code=401,
            content={
                "error": {
                    "code": "authentication_required",
                    "message": "A valid bearer token is required for this API route.",
                    "path": request.url.path,
                    "repair_hint": "Set Authorization: Bearer <APP_AUTH_TOKEN>, or unset APP_AUTH_TOKEN for local demo mode.",
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    return await call_next(request)
