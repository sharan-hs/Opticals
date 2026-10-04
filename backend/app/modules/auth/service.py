"""Sign-up, sign-in and sessions.

A session is a refresh-token *family*: each refresh replaces the token with a
new one in the same family. Presenting a token that was already replaced means
it was copied, so the whole family is revoked (the thief and the real user are
both signed out, and the real user signs in again).
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from ipaddress import ip_address

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError, ConflictError, ForbiddenError, UnauthorizedError
from app.core.security import (
    AccessToken,
    burn_password_check,
    create_access_token,
    hash_password,
    hash_token,
    new_opaque_token,
    verify_password,
)
from app.models import PasswordResetToken, RefreshToken, User
from app.modules.auth import repository as repo
from app.modules.auth.schemas import RegisterRequest
from app.modules.notifications.email import EmailSender
from app.modules.notifications.templates import password_reset_email

logger = logging.getLogger(__name__)

# Two tabs refreshing at once: the second one may still send the token the
# first just replaced. Within this window that's a race, not theft.
REUSE_GRACE_SECONDS = 30


@dataclass(frozen=True)
class ClientInfo:
    ip: str | None
    user_agent: str | None


@dataclass(frozen=True)
class IssuedSession:
    user: User
    access: AccessToken
    refresh_token: str  # raw value for the cookie; only its hash is stored


class InvalidResetTokenError(AppError):
    status_code = 400
    code = "INVALID_RESET_TOKEN"
    message = "This reset link is invalid or has expired. Request a new one."


def _now() -> datetime:
    return datetime.now(UTC)


def _safe_ip(value: str | None) -> str | None:
    try:
        return str(ip_address(value)) if value else None
    except ValueError:
        return None


def _issue(
    db: Session, user: User, client: ClientInfo, *, family_id: uuid.UUID | None = None
) -> tuple[RefreshToken, str]:
    raw = new_opaque_token()
    now = _now()
    token = RefreshToken(
        created_at=now,  # app clock, so expiry and the reuse grace use one clock
        user_id=user.id,
        token_hash=hash_token(raw),
        family_id=family_id or uuid.uuid4(),
        expires_at=now + timedelta(days=get_settings().refresh_token_ttl_days),
        user_agent=(client.user_agent or "")[:500] or None,
        ip=_safe_ip(client.ip),
    )
    db.add(token)
    db.flush()
    return token, raw


def _start_session(db: Session, user: User, client: ClientInfo) -> IssuedSession:
    _, raw = _issue(db, user, client)
    return IssuedSession(user, create_access_token(user.id, user.role), raw)


def register(db: Session, data: RegisterRequest, client: ClientInfo) -> IssuedSession:
    if repo.get_user_by_email(db, data.email) is not None:
        raise ConflictError("An account with this email already exists.", code="EMAIL_TAKEN")
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        last_login_at=_now(),
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:  # lost a race with an identical sign-up
        raise ConflictError(
            "An account with this email already exists.", code="EMAIL_TAKEN"
        ) from exc
    session = _start_session(db, user, client)
    db.commit()
    return session


def login(db: Session, email: str, password: str, client: ClientInfo) -> IssuedSession:
    invalid = UnauthorizedError("Incorrect email or password.", code="INVALID_CREDENTIALS")
    user = repo.get_user_by_email(db, email)
    if user is None:
        burn_password_check(password)
        raise invalid
    valid, new_hash = verify_password(password, user.password_hash)
    if not valid:
        raise invalid
    # Only someone who knows the password learns the account is disabled.
    if not user.is_active:
        raise ForbiddenError("This account has been disabled.", code="ACCOUNT_DISABLED")
    if new_hash:
        user.password_hash = new_hash
    user.last_login_at = _now()
    session = _start_session(db, user, client)
    db.commit()
    return session


def refresh(db: Session, raw_token: str | None, client: ClientInfo) -> IssuedSession:
    expired = UnauthorizedError("Please sign in again.", code="SESSION_EXPIRED")
    if not raw_token:
        raise expired
    token = repo.get_refresh_token_for_update(db, hash_token(raw_token))
    if token is None:
        raise expired
    now = _now()

    if token.replaced_by_id is not None:
        replacement = db.get(RefreshToken, token.replaced_by_id)
        replaced_at = replacement.created_at if replacement else token.created_at
        recent = now - replaced_at < timedelta(seconds=REUSE_GRACE_SECONDS)
        if token.revoked_at is None and recent:
            # The client already holds the replacement; it should retry.
            raise UnauthorizedError("Session refreshed elsewhere; retry.", code="REFRESH_RACE")
        logger.warning("Refresh token reuse; revoking session", extra={"user_id": token.user_id})
        repo.revoke_family(db, token.family_id, now)
        db.commit()
        raise expired
    if token.revoked_at is not None or token.expires_at <= now:
        raise expired

    user = db.get(User, token.user_id)
    if user is None or not user.is_active or user.deleted_at is not None:
        repo.revoke_family(db, token.family_id, now)
        db.commit()
        raise expired

    new_token, raw = _issue(db, user, client, family_id=token.family_id)
    token.replaced_by_id = new_token.id
    db.commit()
    return IssuedSession(user, create_access_token(user.id, user.role), raw)


def logout(db: Session, raw_token: str | None) -> None:
    """Ends this browser's session. Safe to call repeatedly."""
    if not raw_token:
        return
    token = repo.get_refresh_token(db, hash_token(raw_token))
    if token is not None:
        repo.revoke_family(db, token.family_id, _now())
        db.commit()


def logout_everywhere(db: Session, user: User) -> None:
    repo.revoke_user_sessions(db, user.id, _now())
    db.commit()


def current_family(db: Session, raw_token: str | None, user: User) -> uuid.UUID | None:
    """The session family of this browser's refresh cookie, if it belongs to `user`."""
    if not raw_token:
        return None
    token = repo.get_refresh_token(db, hash_token(raw_token))
    return token.family_id if token is not None and token.user_id == user.id else None


def request_password_reset(db: Session, email: str, sender: EmailSender) -> None:
    """Always looks the same to the caller, whether or not the account exists."""
    user = repo.get_user_by_email(db, email)
    if user is None or not user.is_active:
        return
    settings = get_settings()
    raw = new_opaque_token()
    now = _now()
    repo.invalidate_reset_tokens(db, user.id, now)  # only the newest link works
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw),
            expires_at=now + timedelta(minutes=settings.password_reset_ttl_minutes),
        )
    )
    db.commit()
    reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={raw}"
    try:
        sender.send(
            password_reset_email(
                to=user.email,
                name=user.full_name,
                reset_url=reset_url,
                minutes=settings.password_reset_ttl_minutes,
            )
        )
    except Exception:
        logger.exception("Password reset email not sent", extra={"user_id": user.id})


def reset_password(db: Session, raw_token: str, new_password: str) -> None:
    token = repo.get_reset_token_for_update(db, hash_token(raw_token))
    now = _now()
    if token is None or token.used_at is not None or token.expires_at <= now:
        raise InvalidResetTokenError()
    user = db.get(User, token.user_id)
    if user is None or not user.is_active or user.deleted_at is not None:
        raise InvalidResetTokenError()
    user.password_hash = hash_password(new_password)
    token.used_at = now
    repo.invalidate_reset_tokens(db, user.id, now)
    repo.revoke_user_sessions(db, user.id, now)
    db.commit()
