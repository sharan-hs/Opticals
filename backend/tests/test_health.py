from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.core.database import get_db
from app.modules.health import router as health


def test_liveness(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_ok_when_migrated(client: TestClient) -> None:
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok", "migrations": "ok"}


class _BrokenSession:
    def execute(self, *_: object) -> None:
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))


def test_readiness_503_when_database_down(app: FastAPI) -> None:
    def broken_db() -> Iterator[_BrokenSession]:
        yield _BrokenSession()

    app.dependency_overrides[get_db] = broken_db
    with TestClient(app) as client:
        response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json() == {
        "status": "unavailable",
        "database": "error",
        "migrations": "skipped",
    }


def test_readiness_503_when_migrations_behind(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(health, "is_up_to_date", lambda _conn: False)
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["migrations"] == "error"
