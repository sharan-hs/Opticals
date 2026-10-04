"""Who changed what in the admin. Every admin write records one row."""

from collections.abc import Mapping
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog, User


def diff(before: Mapping[str, Any], after: Mapping[str, Any]) -> dict[str, list[Any]]:
    """{field: [old, new]} for fields whose value changed."""
    return {
        key: [before.get(key), value] for key, value in after.items() if before.get(key) != value
    }


def snapshot(obj: object, fields: list[str]) -> dict[str, Any]:
    return {field: _plain(getattr(obj, field)) for field in fields}


def _plain(value: Any) -> Any:
    # Enums and other objects become JSON-friendly strings.
    if value is None or isinstance(value, bool | int | float | str | list | dict):
        return value
    return str(value)


def record(
    db: Session,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: object,
    changes: Mapping[str, Any] | None = None,
    ip: str | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            changes=dict(changes) if changes else None,
            ip=ip,
        )
    )
