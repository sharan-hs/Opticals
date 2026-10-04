"""Users, login sessions, password resets and saved addresses."""

import uuid
from datetime import datetime
from ipaddress import IPv4Address, IPv6Address

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    false,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import CITEXT, INET, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    CreatedAtMixin,
    SoftDeleteMixin,
    TimestampMixin,
    enum_column,
    id_column,
)
from app.models.enums import UserRole

# E.164 without spaces, e.g. +919731307237.
PHONE_PATTERN = r"^\+[1-9][0-9]{7,14}$"


class User(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = id_column()
    email: Mapped[str] = mapped_column(CITEXT, unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(16))
    role: Mapped[UserRole] = enum_column(
        UserRole, default=UserRole.CUSTOMER, server_default=UserRole.CUSTOMER.value
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    addresses: Mapped[list["Address"]] = relationship(back_populates="user", lazy="raise")

    __table_args__ = (
        CheckConstraint(f"phone ~ '{PHONE_PATTERN}'", name="phone_e164"),
        CheckConstraint("length(trim(full_name)) > 0", name="full_name_not_blank"),
        # Staff lookups; customers are the vast majority and aren't indexed.
        Index("ix_users_role_staff", "role", postgresql_where=text("role <> 'CUSTOMER'")),
    )


class RefreshToken(CreatedAtMixin, Base):
    """One row per issued refresh token. Rotation links each token to the
    one that replaced it; reuse of a replaced token revokes the whole family."""

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = id_column()
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # SHA-256 hex of the opaque token; the token itself is never stored.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    replaced_by_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("refresh_tokens.id", ondelete="SET NULL")
    )
    user_agent: Mapped[str | None] = mapped_column(Text)
    ip: Mapped[IPv4Address | IPv6Address | None] = mapped_column(INET)

    __table_args__ = (CheckConstraint("length(token_hash) = 64", name="token_hash_sha256"),)


class PasswordResetToken(CreatedAtMixin, Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = id_column()
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (CheckConstraint("length(token_hash) = 64", name="token_hash_sha256"),)


class Address(TimestampMixin, SoftDeleteMixin, Base):
    """Saved delivery address. Orders copy it, so editing never changes history."""

    __tablename__ = "addresses"

    id: Mapped[int] = id_column()
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str | None] = mapped_column(String(30))
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(16))
    line1: Mapped[str] = mapped_column(String(200))
    line2: Mapped[str | None] = mapped_column(String(200))
    landmark: Mapped[str | None] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(80))
    state: Mapped[str] = mapped_column(String(60))
    pincode: Mapped[str] = mapped_column(String(6))
    country: Mapped[str] = mapped_column(String(2), default="IN", server_default="IN")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    user: Mapped[User] = relationship(back_populates="addresses", lazy="raise")

    __table_args__ = (
        CheckConstraint("pincode ~ '^[1-9][0-9]{5}$'", name="pincode_format"),
        CheckConstraint(f"phone ~ '{PHONE_PATTERN}'", name="phone_e164"),
        CheckConstraint("country = 'IN'", name="country_india"),
        # At most one default address per user (deleted ones don't count).
        Index(
            "uq_addresses_one_default_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("is_default AND deleted_at IS NULL"),
        ),
    )
