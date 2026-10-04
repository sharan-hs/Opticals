import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import PasswordResetToken, RefreshToken, User


def get_user_by_email(db: Session, email: str) -> User | None:
    # citext column: case-insensitive match.
    return db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))


def get_refresh_token_for_update(db: Session, token_hash: str) -> RefreshToken | None:
    """Locks the row so two concurrent refreshes can't both rotate it."""
    return db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash).with_for_update()
    )


def get_refresh_token(db: Session, token_hash: str) -> RefreshToken | None:
    return db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))


def revoke_family(db: Session, family_id: uuid.UUID, now: datetime) -> None:
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )


def revoke_user_sessions(
    db: Session, user_id: int, now: datetime, *, keep_family: uuid.UUID | None = None
) -> None:
    query = update(RefreshToken).where(
        RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None)
    )
    if keep_family is not None:
        query = query.where(RefreshToken.family_id != keep_family)
    db.execute(query.values(revoked_at=now))


def get_reset_token_for_update(db: Session, token_hash: str) -> PasswordResetToken | None:
    return db.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == token_hash)
        .with_for_update()
    )


def invalidate_reset_tokens(db: Session, user_id: int, now: datetime) -> None:
    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user_id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
