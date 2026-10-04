"""The refresh-token cookie and the CSRF check for endpoints that rely on it."""

from fastapi import Request, Response

from app.core.config import get_settings
from app.core.errors import ForbiddenError

REFRESH_COOKIE = "refresh_token"
# Sent only to the auth endpoints, never to the rest of the API.
REFRESH_COOKIE_PATH = "/api/v1/auth"
CSRF_HEADER = "X-Requested-With"
CSRF_HEADER_VALUE = "fetch"


def set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=settings.refresh_token_ttl_days * 24 * 3600,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
    )


def clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        REFRESH_COOKIE,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
    )


def read_refresh_cookie(request: Request) -> str | None:
    return request.cookies.get(REFRESH_COOKIE)


def require_cookie_csrf(request: Request) -> None:
    """Cookie-authenticated endpoints need a header that cross-site forms can't
    send, and (when the browser reports one) a trusted Origin."""
    if request.headers.get(CSRF_HEADER) != CSRF_HEADER_VALUE:
        raise ForbiddenError("Missing request header.", code="CSRF_CHECK_FAILED")
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in get_settings().trusted_origins:
        raise ForbiddenError("Request origin not allowed.", code="CSRF_CHECK_FAILED")
