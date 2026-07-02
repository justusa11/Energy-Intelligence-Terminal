from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]

# CLASS SETTINGS
class Settings(BaseSettings):
    app_name: str = "Energy Intelligence Terminal API"
    environment: str = "development"
    database_url: str
    backend_cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
