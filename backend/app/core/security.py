"""Password hashing (Argon2id), access tokens (JWT) and opaque tokens."""

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import get_settings

JWT_ALGORITHM = "HS256"
# Tolerate small clock differences between servers.
JWT_LEEWAY_SECONDS = 10

_password_hash = PasswordHash((Argon2Hasher(),))


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> tuple[bool, str | None]:
    """Returns (valid, new_hash). new_hash is set when the stored hash uses
    outdated parameters and should be replaced."""
    return _password_hash.verify_and_update(password, password_hash)


@lru_cache
def _dummy_hash() -> str:
    return hash_password(secrets.token_urlsafe(16))


def burn_password_check(password: str) -> None:
    """Spend the same time as a real check, so unknown emails can't be told
    apart from wrong passwords by response time."""
    _password_hash.verify(password, _dummy_hash())


# --- access tokens ----------------------------------------------------------


@dataclass(frozen=True)
class AccessToken:
    token: str
    expires_in: int  # seconds


class InvalidTokenError(Exception):
    def __init__(self, reason: str) -> None:
        self.reason = reason  # "expired" or "invalid"
        super().__init__(reason)


def create_access_token(user_id: int, role: str, *, now: datetime | None = None) -> AccessToken:
    settings = get_settings()
    issued = now or datetime.now(UTC)
    ttl = timedelta(minutes=settings.access_token_ttl_minutes)
    claims = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iat": issued,
        "exp": issued + ttl,
        "jti": uuid.uuid4().hex,
    }
    token = jwt.encode(claims, settings.jwt_secret, algorithm=JWT_ALGORITHM)
    return AccessToken(token=token, expires_in=int(ttl.total_seconds()))


def decode_access_token(token: str) -> int:
    """Returns the user id. The role in the token is informational only; the
    current role is always read from the database."""
    try:
        claims = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[JWT_ALGORITHM],
            leeway=JWT_LEEWAY_SECONDS,
            options={"require": ["sub", "type", "iat", "exp", "jti"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise InvalidTokenError("expired") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidTokenError("invalid") from exc
    if claims.get("type") != "access" or not str(claims["sub"]).isdigit():
        raise InvalidTokenError("invalid")
    return int(claims["sub"])


# --- opaque tokens (refresh, password reset) --------------------------------


def new_opaque_token() -> str:
    """256 bits of randomness, URL-safe."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Tokens are stored only as SHA-256 hashes; a database leak can't be replayed."""
    return hashlib.sha256(token.encode()).hexdigest()
