"""Stock per variant, plus an append-only ledger of every change to it."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, enum_column, id_column
from app.models.catalog import ProductVariant
from app.models.enums import InventoryTransactionType


class Inventory(Base):
    """Current stock of one variant. Available to sell = on_hand - reserved.

    `reserved` is held by unpaid orders inside their payment window. Change
    these numbers only through the inventory service, which also writes the
    ledger row and locks the row (SELECT ... FOR UPDATE).
    """

    __tablename__ = "inventory"

    variant_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("product_variants.id", ondelete="CASCADE"), primary_key=True
    )
    on_hand: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    reserved: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=3, server_default="3")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    variant: Mapped[ProductVariant] = relationship(back_populates="inventory", lazy="raise")

    __table_args__ = (
        CheckConstraint("on_hand >= 0", name="on_hand_not_negative"),
        CheckConstraint("reserved >= 0 AND reserved <= on_hand", name="reserved_within_on_hand"),
        CheckConstraint("low_stock_threshold >= 0", name="threshold_not_negative"),
    )

    @property
    def available(self) -> int:
        return self.on_hand - self.reserved


# Low-stock and out-of-stock reports filter on the available quantity.
Index("ix_inventory_available", Inventory.on_hand - Inventory.reserved)


class InventoryTransaction(CreatedAtMixin, Base):
    """Ledger row. Never updated or deleted; corrections are new rows."""

    __tablename__ = "inventory_transactions"

    id: Mapped[int] = id_column()
    variant_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("product_variants.id", ondelete="RESTRICT")
    )
    type: Mapped[InventoryTransactionType] = enum_column(InventoryTransactionType)
    quantity_delta: Mapped[int] = mapped_column(Integer)  # negative = stock out
    on_hand_after: Mapped[int] = mapped_column(Integer)
    order_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("orders.id", ondelete="RESTRICT"), index=True
    )
    note: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL")
    )

    __table_args__ = (
        CheckConstraint("quantity_delta <> 0", name="delta_not_zero"),
        CheckConstraint("on_hand_after >= 0", name="on_hand_after_not_negative"),
        # Manual stock changes must say why.
        CheckConstraint(
            "type NOT IN ('ADJUSTMENT', 'DAMAGE', 'CORRECTION') "
            "OR length(trim(coalesce(note, ''))) > 0",
            name="note_required_for_manual",
        ),
        CheckConstraint(
            "type NOT IN ('SALE', 'RETURN') OR order_id IS NOT NULL",
            name="order_required_for_sale_return",
        ),
        Index("ix_inventory_transactions_variant_created", "variant_id", text("created_at DESC")),
        Index("ix_inventory_transactions_type_created", "type", "created_at"),
    )
