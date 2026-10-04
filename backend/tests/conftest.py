import os

# Must be set before any app module reads settings.
os.environ["APP_ENV"] = "test"

from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import BACKEND_DIR, get_settings
from app.core.database import engine as app_engine
from app.core.database import get_db
from app.main import create_app


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    """Test database, wiped and migrated once per run."""
    database = make_url(get_settings().sqlalchemy_url).database or ""
    if not database.endswith("_test"):
        pytest.exit(f"Refusing to wipe {database!r}: test database names must end in _test")

    with app_engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        config = Config(str(BACKEND_DIR / "alembic.ini"))
        config.attributes["connection"] = conn
        command.upgrade(config, "head")
    yield app_engine


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    """A session whose work is rolled back after each test, even if the code commits."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def app(db: Session) -> Iterator[FastAPI]:
    application = create_app()
    application.dependency_overrides[get_db] = lambda: db
    yield application


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
