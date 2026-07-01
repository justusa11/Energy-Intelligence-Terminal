from pydantic_settings import BaseSettings, SettingsConfigDict

# CLASS SETTINGS
class Settings(BaseSettings):
    app_name: str = "Energy Intelligence Terminal API"
    environment: str = "development"
    database_url: str
    backend_cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()