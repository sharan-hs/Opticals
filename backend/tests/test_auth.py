"""Sign-up, sign-in, sessions (refresh rotation), logout and password reset."""

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from freezegun import freeze_time
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.core.security import create_access_token
from app.models import RefreshToken, User
from app.models.enums import UserRole
from tests.conftest import Outbox
from tests.factories import auth_headers, make_user

API = "/api/v1"
PASSWORD = "Specs-and-frames-2026"
CSRF = {"X-Requested-With": "fetch"}


def register(client: TestClient, email: str = "Asha@Example.com", **extra: Any) -> Any:
    body = {"email": email, "password": PASSWORD, "full_name": "Asha Rao", **extra}
    return client.post(f"{API}/auth/register", json=body)


def login(client: TestClient, email: str, password: str = PASSWORD) -> Any:
    return client.post(f"{API}/auth/login", json={"email": email, "password": password})


def refresh(client: TestClient, **headers: str) -> Any:
    return client.post(f"{API}/auth/refresh", headers={**CSRF, **headers})


def bearer(response: Any) -> dict[str, str]:
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


# --- register ---------------------------------------------------------------


def test_register_creates_account_and_session(client: TestClient, db: Session) -> None:
    response = register(client, phone="97313 07237")

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "asha@example.com"
    assert body["user"]["phone"] == "+919731307237"
    assert body["user"]["role"] == "CUSTOMER"
    assert body["expires_in"] == 15 * 60

    cookie = response.headers["set-cookie"]
    assert "refresh_token=" in cookie
    assert "HttpOnly" in cookie
    assert "Path=/api/v1/auth" in cookie
    assert "SameSite=lax" in cookie

    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    assert user is not None
    assert user.password_hash.startswith("$argon2id$")
    assert PASSWORD not in user.password_hash


def test_register_duplicate_email_ignoring_case(client: TestClient) -> None:
    register(client)
    response = register(client, email="ASHA@example.com")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_TAKEN"


@pytest.mark.parametrize(
    ("password", "message"),
    [
        ("short1", "at least 8"),
        ("password123", "too easy"),
        ("aaaaaaaaaaaa", "too easy"),
        ("asha@example.com", "email address"),
    ],
)
def test_register_password_policy(client: TestClient, password: str, message: str) -> None:
    response = register(client, password=password)
    assert response.status_code == 422
    assert message in str(response.json()["error"]["details"])


def test_register_rejects_bad_phone(client: TestClient) -> None:
    response = register(client, phone="12345")
    assert response.status_code == 422


# --- login ------------------------------------------------------------------


def test_login_success_updates_last_login(client: TestClient, db: Session) -> None:
    user = make_user(db, email="ravi@example.com", password=PASSWORD)
    response = login(client, "Ravi@Example.com")
    assert response.status_code == 200
    assert response.json()["user"]["id"] == user.id
    db.refresh(user)
    assert user.last_login_at is not None


def test_wrong_password_and_unknown_email_look_the_same(client: TestClient, db: Session) -> None:
    make_user(db, email="ravi@example.com", password=PASSWORD)
    wrong = login(client, "ravi@example.com", "Not-the-password-1")
    unknown = login(client, "nobody@example.com")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"] == unknown.json()["error"]
    assert wrong.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_disabled_account_cannot_log_in(client: TestClient, db: Session) -> None:
    make_user(db, email="gone@example.com", password=PASSWORD, is_active=False)
    response = login(client, "gone@example.com")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ACCOUNT_DISABLED"


def test_login_rate_limited(client: TestClient, db: Session) -> None:
    make_user(db, email="ravi@example.com", password=PASSWORD)
    with freeze_time("2026-10-04 10:00:05"):
        codes = [
            login(client, "ravi@example.com", "Wrong-password-1").status_code for _ in range(6)
        ]
        assert codes == [401] * 5 + [429]
        blocked = login(client, "ravi@example.com")
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "RATE_LIMITED"
    assert blocked.headers["Retry-After"] == "55"
    with freeze_time("2026-10-04 10:01:01"):
        assert login(client, "ravi@example.com").status_code == 200


# --- access tokens ----------------------------------------------------------


def test_me_requires_token(client: TestClient) -> None:
    response = client.get(f"{API}/me")
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_expired_access_token(client: TestClient, db: Session) -> None:
    user = make_user(db)
    old = create_access_token(user.id, user.role, now=datetime.now(UTC) - timedelta(minutes=20))
    response = client.get(f"{API}/me", headers={"Authorization": f"Bearer {old.token}"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "TOKEN_EXPIRED"


def test_tampered_access_token(client: TestClient, db: Session) -> None:
    token = auth_headers(make_user(db))["Authorization"]
    response = client.get(f"{API}/me", headers={"Authorization": token[:-2] + "xx"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "TOKEN_INVALID"


def test_deactivation_applies_to_existing_tokens(client: TestClient, db: Session) -> None:
    user = make_user(db)
    headers = auth_headers(user)
    assert client.get(f"{API}/me", headers=headers).status_code == 200
    user.is_active = False
    db.flush()
    assert client.get(f"{API}/me", headers=headers).status_code == 401


def test_role_check(app: FastAPI, client: TestClient, db: Session) -> None:
    @app.get("/_test/admin-only")
    def admin_only(_: User = Depends(require_role(UserRole.ADMIN))) -> dict[str, bool]:
        return {"ok": True}

    customer = auth_headers(make_user(db))
    admin = auth_headers(make_user(db, role=UserRole.ADMIN))
    assert client.get("/_test/admin-only").status_code == 401
    assert client.get("/_test/admin-only", headers=customer).status_code == 403
    assert client.get("/_test/admin-only", headers=admin).status_code == 200


# --- refresh & logout -------------------------------------------------------


def test_refresh_rotates_cookie_and_returns_new_token(client: TestClient) -> None:
    first = register(client)
    old_cookie = client.cookies["refresh_token"]

    response = refresh(client)

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "asha@example.com"
    assert response.json()["access_token"] != first.json()["access_token"]
    assert client.cookies["refresh_token"] != old_cookie
    assert client.get(f"{API}/me", headers=bearer(response)).status_code == 200


def test_refresh_needs_csrf_header_and_trusted_origin(client: TestClient) -> None:
    register(client)
    no_header = client.post(f"{API}/auth/refresh")
    assert no_header.status_code == 403
    assert no_header.json()["error"]["code"] == "CSRF_CHECK_FAILED"
    assert refresh(client, Origin="https://evil.example").status_code == 403
    assert refresh(client, Origin="http://localhost:3000").status_code == 200


def test_refresh_without_cookie(client: TestClient) -> None:
    response = refresh(client)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SESSION_EXPIRED"


def test_reused_refresh_token_revokes_the_session(client: TestClient, db: Session) -> None:
    with freeze_time("2026-10-04 10:00:00"):
        register(client)
        stolen = client.cookies["refresh_token"]
        assert refresh(client).status_code == 200  # rotates; `stolen` is now replaced
        current = client.cookies["refresh_token"]

    with freeze_time("2026-10-04 10:05:00"):
        client.cookies.set("refresh_token", stolen, path="/api/v1/auth")
        reuse = refresh(client)
        assert reuse.status_code == 401
        assert reuse.json()["error"]["code"] == "SESSION_EXPIRED"

        # The legitimate newer token is revoked too.
        client.cookies.set("refresh_token", current, path="/api/v1/auth")
        assert refresh(client).status_code == 401

    assert all(t.revoked_at is not None for t in db.scalars(select(RefreshToken)))


def test_concurrent_refresh_within_grace_is_not_theft(client: TestClient) -> None:
    with freeze_time("2026-10-04 10:00:00"):
        register(client)
        first = client.cookies["refresh_token"]
        assert refresh(client).status_code == 200
        current = client.cookies["refresh_token"]

        client.cookies.set("refresh_token", first, path="/api/v1/auth")
        race = refresh(client)
        assert race.status_code == 401
        assert race.json()["error"]["code"] == "REFRESH_RACE"

        client.cookies.set("refresh_token", current, path="/api/v1/auth")
        assert refresh(client).status_code == 200


def test_refresh_token_expires(client: TestClient) -> None:
    with freeze_time("2026-10-04 10:00:00"):
        register(client)
    with freeze_time("2026-11-04 10:00:01"):  # 31 days later
        assert refresh(client).status_code == 401


def test_logout_ends_session_and_clears_cookie(client: TestClient) -> None:
    register(client)
    cookie = client.cookies["refresh_token"]
    response = client.post(f"{API}/auth/logout", headers=CSRF)
    assert response.status_code == 204
    assert 'refresh_token=""' in response.headers["set-cookie"]

    client.cookies.set("refresh_token", cookie, path="/api/v1/auth")
    assert refresh(client).status_code == 401
    # Idempotent
    assert client.post(f"{API}/auth/logout", headers=CSRF).status_code == 204


def test_logout_all_ends_every_session(client: TestClient, db: Session) -> None:
    make_user(db, email="ravi@example.com", password=PASSWORD)
    other_device = login(client, "ravi@example.com")
    other_cookie = client.cookies["refresh_token"]
    this_device = login(client, "ravi@example.com")

    assert client.post(f"{API}/auth/logout-all", headers=bearer(this_device)).status_code == 204
    client.cookies.set("refresh_token", other_cookie, path="/api/v1/auth")
    assert refresh(client).status_code == 401
    assert other_device.status_code == 200


# --- password reset ---------------------------------------------------------


def reset_token_from(outbox: Outbox) -> str:
    text = outbox.messages[-1].text
    return text.split("reset-password?token=")[1].split()[0]


def test_forgot_password_unknown_email_sends_nothing(client: TestClient, outbox: Outbox) -> None:
    response = client.post(f"{API}/auth/forgot-password", json={"email": "nobody@example.com"})
    assert response.status_code == 202
    assert outbox.messages == []


def test_password_reset_flow(client: TestClient, db: Session, outbox: Outbox) -> None:
    make_user(db, email="ravi@example.com", password=PASSWORD, full_name="Ravi")
    old_session = login(client, "ravi@example.com")
    assert old_session.status_code == 200

    response = client.post(f"{API}/auth/forgot-password", json={"email": "Ravi@example.com"})
    assert response.status_code == 202
    assert outbox.messages[0].to == "ravi@example.com"
    assert "http://localhost:3000/reset-password?token=" in outbox.messages[0].html
    token = reset_token_from(outbox)

    new_password = "Brand-new-frames-9"
    reset = client.post(
        f"{API}/auth/reset-password", json={"token": token, "new_password": new_password}
    )
    assert reset.status_code == 204

    assert refresh(client).status_code == 401  # all sessions revoked
    assert login(client, "ravi@example.com").status_code == 401
    assert login(client, "ravi@example.com", new_password).status_code == 200

    again = client.post(
        f"{API}/auth/reset-password", json={"token": token, "new_password": "Another-one-77"}
    )
    assert again.status_code == 400
    assert again.json()["error"]["code"] == "INVALID_RESET_TOKEN"


def test_reset_token_expires_after_30_minutes(
    client: TestClient, db: Session, outbox: Outbox
) -> None:
    make_user(db, email="ravi@example.com", password=PASSWORD)
    with freeze_time("2026-10-04 10:00:00"):
        client.post(f"{API}/auth/forgot-password", json={"email": "ravi@example.com"})
    token = reset_token_from(outbox)
    with freeze_time("2026-10-04 10:30:01"):
        response = client.post(
            f"{API}/auth/reset-password", json={"token": token, "new_password": "Brand-new-9x"}
        )
    assert response.status_code == 400


def test_new_reset_request_invalidates_older_link(
    client: TestClient, db: Session, outbox: Outbox
) -> None:
    make_user(db, email="ravi@example.com", password=PASSWORD)
    client.post(f"{API}/auth/forgot-password", json={"email": "ravi@example.com"})
    first = reset_token_from(outbox)
    client.post(f"{API}/auth/forgot-password", json={"email": "ravi@example.com"})
    body = {"token": first, "new_password": "Brand-new-9x"}
    assert client.post(f"{API}/auth/reset-password", json=body).status_code == 400
