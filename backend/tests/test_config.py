from typing import Any

import pytest
from pydantic import ValidationError

from app.core.config import DEV_JWT_SECRET, Settings

DB = "postgresql+psycopg://u:p@localhost/opticals_dev"
STRONG = "x" * 48


def make(**overrides: Any) -> Settings:
    # _env_file=None skips backend/.env; app_env is explicit because the test
    # run itself sets APP_ENV=test.
    values = {"app_env": "development", "database_url": DB, **overrides}
    return Settings(_env_file=None, **values)


def test_postgres_urls_use_psycopg_driver() -> None:
    assert make(database_url="postgres://u:p@h/db").database_url == "postgresql+psycopg://u:p@h/db"
    assert (
        make(database_url="postgresql://u:p@h/db").database_url == "postgresql+psycopg://u:p@h/db"
    )


def test_cors_origins_from_comma_separated_string() -> None:
    settings = make(cors_origins="https://a.example/, https://b.example")
    assert settings.cors_origins == ["https://a.example", "https://b.example"]


def test_wildcard_cors_rejected() -> None:
    with pytest.raises(ValidationError, match="exact origins"):
        make(cors_origins="*")


def test_production_refuses_default_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        make(app_env="production", jwt_secret=DEV_JWT_SECRET, cors_origins="https://shop.example")


def test_production_refuses_local_origins() -> None:
    with pytest.raises(ValidationError, match="local origins"):
        make(app_env="production", jwt_secret=STRONG, cors_origins="http://localhost:3000")


def test_production_with_real_values() -> None:
    settings = make(app_env="production", jwt_secret=STRONG, cors_origins="https://shop.example")
    assert settings.is_production


def test_test_env_uses_test_database() -> None:
    settings = make(app_env="test", test_database_url="postgresql://u:p@h/opticals_test")
    assert settings.sqlalchemy_url.endswith("/opticals_test")


def test_database_url_required_outside_tests() -> None:
    with pytest.raises(ValidationError, match="DATABASE_URL"):
        make(app_env="development", database_url=None)
