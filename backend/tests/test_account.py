"""Profile, change password, saved addresses, and the create-admin command."""

from contextlib import nullcontext
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from typer.testing import CliRunner

import app.cli as cli_module
from app.models import User
from app.models.enums import UserRole
from tests.conftest import Outbox
from tests.factories import auth_headers, make_user

API = "/api/v1"
PASSWORD = "Specs-and-frames-2026"

ADDRESS = {
    "label": "Home",
    "full_name": "Asha Rao",
    "phone": "97313 07237",
    "line1": "476A, Siddhaiah Puranik Road",
    "city": "Bengaluru",
    "state": "karnataka",
    "pincode": "560 079",
}


def add_address(client: TestClient, headers: dict[str, str], **extra: Any) -> Any:
    return client.post(f"{API}/me/addresses", json={**ADDRESS, **extra}, headers=headers)


# --- profile ----------------------------------------------------------------


def test_get_and_update_profile(client: TestClient, db: Session) -> None:
    headers = auth_headers(make_user(db, full_name="Asha"))
    assert client.get(f"{API}/me", headers=headers).json()["full_name"] == "Asha"

    response = client.patch(
        f"{API}/me", json={"full_name": "  Asha Rao ", "phone": "080 2340 7691"}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Asha Rao"
    assert response.json()["phone"] == "+918023407691"

    cleared = client.patch(f"{API}/me", json={"phone": ""}, headers=headers)
    assert cleared.json()["phone"] is None


def test_profile_cannot_change_role_or_email(client: TestClient, db: Session) -> None:
    user = make_user(db)
    client.patch(
        f"{API}/me", json={"role": "ADMIN", "email": "x@example.com"}, headers=auth_headers(user)
    )
    db.refresh(user)
    assert user.role == UserRole.CUSTOMER
    assert user.email != "x@example.com"


def test_change_password_keeps_this_session_only(
    client: TestClient, db: Session, outbox: Outbox
) -> None:
    make_user(db, email="ravi@example.com", password=PASSWORD)
    login_body = {"email": "ravi@example.com", "password": PASSWORD}
    client.post(f"{API}/auth/login", json=login_body)
    other_device = client.cookies["refresh_token"]
    this_device = client.post(f"{API}/auth/login", json=login_body)
    headers = {"Authorization": f"Bearer {this_device.json()['access_token']}"}

    wrong = client.post(
        f"{API}/auth/change-password",
        json={"current_password": "Nope-nope-123", "new_password": "Fresh-lenses-42"},
        headers=headers,
    )
    assert wrong.status_code == 400
    assert wrong.json()["error"]["code"] == "WRONG_PASSWORD"

    ok = client.post(
        f"{API}/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "Fresh-lenses-42"},
        headers=headers,
    )
    assert ok.status_code == 204
    assert outbox.messages[-1].subject == "Your password was changed"

    csrf = {"X-Requested-With": "fetch"}
    assert client.post(f"{API}/auth/refresh", headers=csrf).status_code == 200  # this device
    client.cookies.set("refresh_token", other_device, path="/api/v1/auth")
    assert client.post(f"{API}/auth/refresh", headers=csrf).status_code == 401


# --- addresses --------------------------------------------------------------


def test_first_address_becomes_default_and_is_normalised(client: TestClient, db: Session) -> None:
    headers = auth_headers(make_user(db))
    response = add_address(client, headers)
    assert response.status_code == 201
    body = response.json()
    assert body["is_default"] is True
    assert body["state"] == "Karnataka"
    assert body["pincode"] == "560079"
    assert body["phone"] == "+919731307237"
    assert body["country"] == "IN"


@pytest.mark.parametrize(
    ("field", "value"),
    [("pincode", "056007"), ("state", "Narnia"), ("phone", "123"), ("line1", "")],
)
def test_address_validation(client: TestClient, db: Session, field: str, value: str) -> None:
    response = add_address(client, auth_headers(make_user(db)), **{field: value})
    assert response.status_code == 422


def test_default_address_moves(client: TestClient, db: Session) -> None:
    headers = auth_headers(make_user(db))
    first = add_address(client, headers).json()
    second = add_address(client, headers, label="Work", is_default=True).json()
    listed = client.get(f"{API}/me/addresses", headers=headers).json()
    assert [(a["id"], a["is_default"]) for a in listed] == [
        (second["id"], True),
        (first["id"], False),
    ]

    assert (
        client.post(f"{API}/me/addresses/{first['id']}/default", headers=headers).status_code == 204
    )
    listed = client.get(f"{API}/me/addresses", headers=headers).json()
    assert listed[0]["id"] == first["id"] and listed[0]["is_default"]


def test_deleting_default_promotes_another(client: TestClient, db: Session) -> None:
    headers = auth_headers(make_user(db))
    first = add_address(client, headers).json()
    second = add_address(client, headers, label="Work").json()
    assert client.delete(f"{API}/me/addresses/{first['id']}", headers=headers).status_code == 204
    listed = client.get(f"{API}/me/addresses", headers=headers).json()
    assert [(a["id"], a["is_default"]) for a in listed] == [(second["id"], True)]


def test_update_address(client: TestClient, db: Session) -> None:
    headers = auth_headers(make_user(db))
    address = add_address(client, headers).json()
    response = client.patch(
        f"{API}/me/addresses/{address['id']}",
        json={"line2": "3rd Block", "city": "Bangalore"},
        headers=headers,
    )
    assert response.status_code == 200
    assert (response.json()["line2"], response.json()["city"]) == ("3rd Block", "Bangalore")
    assert response.json()["line1"] == ADDRESS["line1"]


def test_other_users_address_is_not_found(client: TestClient, db: Session) -> None:
    owner = auth_headers(make_user(db))
    stranger = auth_headers(make_user(db))
    address = add_address(client, owner).json()
    url = f"{API}/me/addresses/{address['id']}"
    assert client.patch(url, json={"city": "X"}, headers=stranger).status_code == 404
    assert client.delete(url, headers=stranger).status_code == 404
    assert client.post(f"{url}/default", headers=stranger).status_code == 404


def test_address_limit(client: TestClient, db: Session) -> None:
    headers = auth_headers(make_user(db))
    for n in range(10):
        assert add_address(client, headers, label=f"A{n}").status_code == 201
    response = add_address(client, headers, label="One too many")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ADDRESS_LIMIT"


# --- create-admin -----------------------------------------------------------


@pytest.fixture
def cli_db(db: Session, monkeypatch: pytest.MonkeyPatch) -> Session:
    monkeypatch.setattr(cli_module, "SessionLocal", lambda: nullcontext(db))
    return db


def test_create_admin(cli_db: Session) -> None:
    result = CliRunner().invoke(
        cli_module.cli,
        ["create-admin", "--email", "Owner@Example.com", "--full-name", "Owner"],
        input="Strong-admin-pass-1\nStrong-admin-pass-1\n",
    )
    assert result.exit_code == 0, result.output
    user = cli_db.scalar(select(User).where(User.email == "owner@example.com"))
    assert user is not None and user.role == UserRole.ADMIN


def test_create_admin_rejects_weak_password(cli_db: Session) -> None:
    result = CliRunner().invoke(
        cli_module.cli,
        ["create-admin", "--email", "owner@example.com", "--full-name", "Owner"],
        input="password123\npassword123\n",
    )
    assert result.exit_code == 1
    assert "too easy" in result.output


def test_create_admin_promotes_existing_user(cli_db: Session) -> None:
    make_user(cli_db, email="staff@example.com")
    result = CliRunner().invoke(
        cli_module.cli,
        ["create-admin", "--email", "staff@example.com", "--full-name", "x"],
        input="y\n",
    )
    assert result.exit_code == 0, result.output
    user = cli_db.scalar(select(User).where(User.email == "staff@example.com"))
    assert user is not None and user.role == UserRole.ADMIN
