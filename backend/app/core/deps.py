"""Shared FastAPI dependencies: current user, role/permission checks, client IP."""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.permissions import Permission, has_permission
from app.core.security import InvalidTokenError, decode_access_token
from app.models import User
from app.models.enums import UserRole

_bearer = HTTPBearer(auto_error=False, description="Access token from /auth/login")

DbSession = Annotated[Session, Depends(get_db)]


def client_ip(request: Request) -> str | None:
    if get_settings().trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for", "")
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else None


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    """Valid access token AND an active account. The role comes from the
    database, so deactivation or a role change applies immediately."""
    if credentials is None:
        raise UnauthorizedError()
    try:
        user_id = decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        if exc.reason == "expired":
            raise UnauthorizedError("Your session has expired.", code="TOKEN_EXPIRED") from exc
        raise UnauthorizedError("Invalid access token.", code="TOKEN_INVALID") from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active or user.deleted_at is not None:
        raise UnauthorizedError("Account not available.", code="TOKEN_INVALID")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole) -> Callable[[User], User]:
    def dependency(user: CurrentUser) -> User:
        if user.role not in roles:
            raise ForbiddenError()
        return user

    return dependency


def require_permission(permission: Permission) -> Callable[[User], User]:
    def dependency(user: CurrentUser) -> User:
        if not has_permission(user.role, permission):
            raise ForbiddenError()
        return user

    return dependency


AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN))]
