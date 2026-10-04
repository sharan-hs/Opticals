import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, select, update
from sqlalchemy.orm import Session

from app.core.errors import AppError, BusinessRuleError, NotFoundError
from app.core.security import hash_password, verify_password
from app.models import Address, User
from app.modules.auth import repository as auth_repo
from app.modules.notifications.email import EmailSender
from app.modules.notifications.templates import password_changed_email
from app.modules.users.schemas import AddressCreate, AddressUpdate, ProfileUpdate

logger = logging.getLogger(__name__)

MAX_ADDRESSES = 10


class WrongPasswordError(AppError):
    status_code = 400
    code = "WRONG_PASSWORD"
    message = "Your current password is incorrect."


def update_profile(db: Session, user: User, data: ProfileUpdate) -> User:
    fields = data.model_dump(exclude_unset=True)
    if "full_name" in fields and data.full_name is not None:
        user.full_name = data.full_name
    if "phone" in fields:
        user.phone = data.phone or None
    db.commit()
    return user


def change_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
    *,
    keep_family: uuid.UUID | None,
    sender: EmailSender,
) -> None:
    """Other devices are signed out; this browser's session stays."""
    valid, _ = verify_password(current_password, user.password_hash)
    if not valid:
        raise WrongPasswordError()
    user.password_hash = hash_password(new_password)
    auth_repo.revoke_user_sessions(db, user.id, datetime.now(UTC), keep_family=keep_family)
    db.commit()
    try:
        sender.send(password_changed_email(to=user.email, name=user.full_name))
    except Exception:
        logger.exception("Password-changed email not sent", extra={"user_id": user.id})


# --- addresses --------------------------------------------------------------


def _active_addresses(user: User) -> Select[Address]:
    return select(Address).where(Address.user_id == user.id, Address.deleted_at.is_(None))


def list_addresses(db: Session, user: User) -> list[Address]:
    query = _active_addresses(user).order_by(Address.is_default.desc(), Address.id.desc())
    return list(db.scalars(query))


def _get_owned(db: Session, user: User, address_id: int) -> Address:
    # Someone else's address is reported as missing, not forbidden.
    address = db.scalar(_active_addresses(user).where(Address.id == address_id))
    if address is None:
        raise NotFoundError("Address not found.")
    return address


def _clear_default(db: Session, user: User) -> None:
    # Separate statement so the "one default" index never sees two defaults.
    db.execute(
        update(Address)
        .where(Address.user_id == user.id, Address.is_default.is_(True))
        .values(is_default=False)
    )


def create_address(db: Session, user: User, data: AddressCreate) -> Address:
    existing = list_addresses(db, user)
    if len(existing) >= MAX_ADDRESSES:
        raise BusinessRuleError(
            f"You can save up to {MAX_ADDRESSES} addresses.", code="ADDRESS_LIMIT"
        )
    make_default = data.is_default or not existing
    if make_default:
        _clear_default(db, user)
    address = Address(user_id=user.id, **data.model_dump(), country="IN")
    address.is_default = make_default
    db.add(address)
    db.commit()
    return address


def update_address(db: Session, user: User, address_id: int, data: AddressUpdate) -> Address:
    address = _get_owned(db, user, address_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field in {"full_name", "phone", "line1", "city", "state", "pincode"}:
            continue  # required fields can't be cleared
        setattr(address, field, value)
    db.commit()
    return address


def delete_address(db: Session, user: User, address_id: int) -> None:
    address = _get_owned(db, user, address_id)
    address.deleted_at = datetime.now(UTC)
    was_default = address.is_default
    address.is_default = False
    db.flush()
    if was_default:
        newest = db.scalar(_active_addresses(user).order_by(Address.id.desc()).limit(1))
        if newest is not None:
            newest.is_default = True
    db.commit()


def set_default_address(db: Session, user: User, address_id: int) -> None:
    address = _get_owned(db, user, address_id)
    _clear_default(db, user)
    db.flush()
    address.is_default = True
    db.commit()
