from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal, Self

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]

DEV_JWT_SECRET = "dev-only-insecure-jwt-secret"  # noqa: S105 (a known placeholder)

AppEnv = Literal["development", "test", "staging", "production"]


def to_psycopg_url(url: str) -> str:
    """Hosts hand out postgres:// URLs; SQLAlchemy needs the psycopg 3 driver name."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url.removeprefix(prefix)
    return url


class Settings(BaseSettings):
    """All configuration comes from environment variables (or backend/.env locally)."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_env: AppEnv = "development"

    database_url: str | None = None
    test_database_url: str | None = None

    # Exact origins only; "*" can't be combined with cookies.
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    frontend_url: str = "http://localhost:3000"

    jwt_secret: str = DEV_JWT_SECRET

    log_level: str = "INFO"
    sentry_dsn: str | None = None

    @field_validator("database_url", "test_database_url")
    @classmethod
    def _normalise_database_url(cls, value: str | None) -> str | None:
        return to_psycopg_url(value) if value else None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("log_level")
    @classmethod
    def _upper_log_level(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def _check_environment(self) -> Self:
        if self.app_env == "test":
            if not self.test_database_url:
                raise ValueError("TEST_DATABASE_URL is required when APP_ENV=test")
        elif not self.database_url:
            raise ValueError("DATABASE_URL is required")

        if "*" in self.cors_origins:
            raise ValueError("CORS_ORIGINS must list exact origins, not '*'")

        if self.app_env == "production":
            if self.jwt_secret == DEV_JWT_SECRET or len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be set to a random value of 32+ characters")
            local = [o for o in self.cors_origins if "localhost" in o or "127.0.0.1" in o]
            if local:
                raise ValueError(f"CORS_ORIGINS must not include local origins: {local}")
        return self

    @property
    def sqlalchemy_url(self) -> str:
        url = self.test_database_url if self.app_env == "test" else self.database_url
        assert url is not None  # guaranteed by _check_environment  # noqa: S101
        return url

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
