from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    Identity,
    MetaData,
    Table,
    event,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Predictable constraint names, so migrations can refer to (and drop) them and
# API errors can report which unique constraint was hit.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def id_column() -> Mapped[int]:
    return mapped_column(BigInteger, Identity(always=True), primary_key=True)


class CreatedAtMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TimestampMixin(CreatedAtMixin):
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class SoftDeleteMixin:
    """Rows are hidden, not removed, when history depends on them."""

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


def enum_column(enum_cls: type[StrEnum], *, length: int = 20, **kwargs: Any) -> Any:
    """A varchar column limited to the enum's values by a CHECK constraint.

    Easier to evolve than native Postgres enums: adding a value is a
    constraint change in a migration. The constraint is named after the
    column (ck_<table>_<column>), and added explicitly rather than by the
    Enum type so Alembic renders it exactly once.
    """
    column_type = Enum(
        enum_cls,
        native_enum=False,
        create_constraint=False,
        length=length,
        values_callable=lambda members: [member.value for member in members],
        validate_strings=True,
    )
    mapped = mapped_column(column_type, **kwargs)
    values = ", ".join(f"'{member.value}'" for member in enum_cls)

    @event.listens_for(mapped.column, "after_parent_attach")
    def _add_check(column: Column[Any], table: Table) -> None:
        table.append_constraint(CheckConstraint(f"{column.name} IN ({values})", name=column.name))

    return mapped
