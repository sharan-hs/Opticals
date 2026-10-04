from collections.abc import Iterator

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ConflictError, NotFoundError


class SignUp(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+$")
    password: str


@pytest.fixture
def error_client(app: FastAPI, db: Session) -> Iterator[TestClient]:
    """The real app plus a few routes that fail in known ways."""

    @app.get("/_test/not-found")
    def not_found() -> None:
        raise NotFoundError("Product not found", details={"slug": "nope"})

    @app.get("/_test/conflict")
    def conflict() -> None:
        raise ConflictError(code="OUT_OF_STOCK", message="Only 1 left")

    @app.post("/_test/validate")
    def validate(body: SignUp) -> None:
        return None

    @app.get("/_test/integrity")
    def integrity(session: Session = Depends(get_db)) -> None:
        session.execute(text("CREATE TEMP TABLE t (slug text CONSTRAINT uq_t_slug UNIQUE)"))
        session.execute(text("INSERT INTO t VALUES ('a'), ('a')"))

    @app.get("/_test/crash")
    def crash() -> None:
        raise RuntimeError("secret internal detail")

    # Without this, TestClient re-raises server errors instead of returning the 500.
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


def test_app_error_envelope(error_client: TestClient) -> None:
    response = error_client.get("/_test/not-found")
    assert response.status_code == 404
    body = response.json()
    assert body["error"] == {
        "code": "NOT_FOUND",
        "message": "Product not found",
        "details": {"slug": "nope"},
    }
    assert body["request_id"] == response.headers["X-Request-ID"]


def test_custom_code_on_app_error(error_client: TestClient) -> None:
    response = error_client.get("/_test/conflict")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "OUT_OF_STOCK"


def test_validation_error_hides_submitted_values(error_client: TestClient) -> None:
    response = error_client.post(
        "/_test/validate", json={"email": "not-an-email", "password": "hunter2"}
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert [d["field"] for d in error["details"]] == ["email"]
    assert "hunter2" not in response.text


def test_integrity_error_is_409_with_constraint(error_client: TestClient) -> None:
    response = error_client.get("/_test/integrity")
    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "CONFLICT",
        "message": "This conflicts with existing data.",
        "details": {"constraint": "uq_t_slug"},
    }


def test_unhandled_error_is_generic_500(error_client: TestClient) -> None:
    response = error_client.get("/_test/crash")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "secret" not in response.text
    assert response.headers["X-Request-ID"]


def test_unknown_route_uses_envelope(client: TestClient) -> None:
    response = client.get("/nope")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_wrong_method_uses_envelope(client: TestClient) -> None:
    response = client.post("/health")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_request_id_echoed_when_safe(client: TestClient) -> None:
    assert (
        client.get("/health", headers={"X-Request-ID": "abc-123"}).headers["X-Request-ID"]
        == "abc-123"
    )
    unsafe = client.get("/health", headers={"X-Request-ID": "<script>"})
    assert unsafe.headers["X-Request-ID"] != "<script>"
