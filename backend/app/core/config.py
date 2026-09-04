from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MyApp API"
    app_version: str = "0.1.0"
    environment: str = "development"

    database_url: str
    alembic_database_url: str

    session_cookie_name: str = "myapp_session"
    session_expire_hours: int = 8

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()