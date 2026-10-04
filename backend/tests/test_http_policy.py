"""CORS and security headers."""

from fastapi.testclient import TestClient

ALLOWED = "http://localhost:3000"


def test_cors_preflight_allows_frontend_with_credentials(client: TestClient) -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": ALLOWED,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Idempotency-Key",
        },
    )
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == ALLOWED
    assert response.headers["Access-Control-Allow-Credentials"] == "true"


def test_cors_rejects_unknown_origin(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "Access-Control-Allow-Origin" not in response.headers


def test_error_responses_carry_cors_headers(client: TestClient) -> None:
    # Otherwise the browser hides the error body from the frontend.
    response = client.get("/nope", headers={"Origin": ALLOWED})
    assert response.status_code == 404
    assert response.headers["Access-Control-Allow-Origin"] == ALLOWED


def test_security_headers(client: TestClient) -> None:
    headers = client.get("/health").headers
    assert headers["X-Content-Type-Options"] == "nosniff"
    assert headers["X-Frame-Options"] == "DENY"
    assert headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    # HSTS only in production.
    assert "Strict-Transport-Security" not in headers
