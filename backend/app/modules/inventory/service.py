"""Stock levels. Every change goes through here: the inventory row is locked
(SELECT ... FOR UPDATE), checked, updated, and a ledger row is written in the
same transaction. Callers commit.

    on_hand   physically in the shop's online stock
    reserved  held by unpaid orders inside their payment window
    available on_hand - reserved (what can still be sold)
"""

from collections.abc import Iterable
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError, BusinessRuleError, NotFoundError
from app.models import Inventory, InventoryTransaction, ProductVariant
from app.models.enums import InventoryTransactionType as T

MANUAL_TYPES = {T.RESTOCK, T.ADJUSTMENT, T.DAMAGE, T.CORRECTION}


class OutOfStockError(AppError):
    status_code = 409
    code = "OUT_OF_STOCK"
    message = "Not enough stock."


class StockBelowReservedError(AppError):
    status_code = 400
    code = "STOCK_BELOW_RESERVED"


@dataclass(frozen=True)
class StockLine:
    variant_id: int
    quantity: int


def lock(db: Session, variant_id: int) -> Inventory:
    inventory = db.scalar(
        select(Inventory).where(Inventory.variant_id == variant_id).with_for_update()
    )
    if inventory is None:
        raise NotFoundError("No stock record for this item.")
    return inventory


def _lock_many(db: Session, lines: Iterable[StockLine]) -> dict[int, Inventory]:
    # Always lock in variant order so two orders can't deadlock each other.
    ids = sorted({line.variant_id for line in lines})
    rows = db.scalars(
        select(Inventory)
        .where(Inventory.variant_id.in_(ids))
        .order_by(Inventory.variant_id)
        .with_for_update()
    ).all()
    found = {row.variant_id: row for row in rows}
    if len(found) != len(ids):
        raise NotFoundError("No stock record for an item.")
    return found


def _ledger(
    db: Session,
    inventory: Inventory,
    type_: T,
    delta: int,
    *,
    note: str | None = None,
    order_id: int | None = None,
    actor_id: int | None = None,
) -> InventoryTransaction:
    entry = InventoryTransaction(
        variant_id=inventory.variant_id,
        type=type_,
        quantity_delta=delta,
        on_hand_after=inventory.on_hand,
        order_id=order_id,
        note=note,
        created_by=actor_id,
    )
    db.add(entry)
    return entry


def adjust(
    db: Session,
    variant_id: int,
    type_: T,
    delta: int,
    *,
    note: str | None,
    actor_id: int | None,
) -> Inventory:
    """Manual stock change from the admin (restock, count correction, damage)."""
    if type_ not in MANUAL_TYPES:
        raise BusinessRuleError("This kind of change comes from orders.", code="INVALID_TYPE")
    if delta == 0:
        raise BusinessRuleError("Enter a quantity other than 0.", code="ZERO_QUANTITY")
    if type_ == T.RESTOCK and delta < 0:
        raise BusinessRuleError("A restock adds stock; use an adjustment to remove it.")
    if type_ == T.DAMAGE and delta > 0:
        raise BusinessRuleError("Damage removes stock; enter a negative quantity.")
    note = (note or "").strip() or None
    if type_ != T.RESTOCK and note is None:
        raise BusinessRuleError("Add a note explaining the change.", code="NOTE_REQUIRED")

    inventory = lock(db, variant_id)
    new_on_hand = inventory.on_hand + delta
    if new_on_hand < inventory.reserved:
        raise StockBelowReservedError(
            f"Only {inventory.on_hand - inventory.reserved} can be removed: "
            f"{inventory.reserved} are held by unpaid orders.",
            details={"on_hand": inventory.on_hand, "reserved": inventory.reserved},
        )
    inventory.on_hand = new_on_hand
    _ledger(db, inventory, type_, delta, note=note, actor_id=actor_id)
    db.flush()
    return inventory


def mark_out_of_stock(db: Session, variant_id: int, *, note: str, actor_id: int) -> Inventory:
    """Removes all available stock (anything reserved stays reserved)."""
    inventory = lock(db, variant_id)
    available = inventory.on_hand - inventory.reserved
    if available <= 0:
        return inventory
    return adjust(db, variant_id, T.ADJUSTMENT, -available, note=note, actor_id=actor_id)


def set_threshold(db: Session, variant_id: int, threshold: int) -> Inventory:
    inventory = lock(db, variant_id)
    inventory.low_stock_threshold = threshold
    db.flush()
    return inventory


def ensure_row(db: Session, variant: ProductVariant, threshold: int = 3) -> Inventory:
    """Every variant has a stock row from the moment it exists."""
    inventory = db.get(Inventory, variant.id)
    if inventory is None:
        inventory = Inventory(variant_id=variant.id, low_stock_threshold=threshold)
        db.add(inventory)
        db.flush()
    return inventory


# --- used by checkout and orders (Phase 8) ----------------------------------


def reserve(db: Session, lines: list[StockLine]) -> None:
    """Hold stock for a new unpaid order. All lines or none."""
    rows = _lock_many(db, lines)
    shortages = []
    for line in lines:
        row = rows[line.variant_id]
        available = row.on_hand - row.reserved
        if line.quantity > available:
            shortages.append({"variant_id": line.variant_id, "available": max(available, 0)})
    if shortages:
        raise OutOfStockError(details={"items": shortages})
    for line in lines:
        rows[line.variant_id].reserved += line.quantity
    db.flush()


def release(db: Session, lines: list[StockLine]) -> None:
    """Give back stock held by an order that expired or was cancelled unpaid."""
    rows = _lock_many(db, lines)
    for line in lines:
        row = rows[line.variant_id]
        row.reserved = max(0, row.reserved - line.quantity)
    db.flush()


def commit_sale(db: Session, lines: list[StockLine], *, order_id: int) -> None:
    """Payment confirmed: reserved stock leaves the shop (ledger SALE rows)."""
    rows = _lock_many(db, lines)
    for line in lines:
        row = rows[line.variant_id]
        row.reserved = max(0, row.reserved - line.quantity)
        row.on_hand -= line.quantity
        _ledger(db, row, T.SALE, -line.quantity, order_id=order_id)
    db.flush()


def restock_returned(
    db: Session, lines: list[StockLine], *, order_id: int, actor_id: int | None
) -> None:
    """A paid order was cancelled or returned and the frames are back on the shelf."""
    rows = _lock_many(db, lines)
    for line in lines:
        row = rows[line.variant_id]
        row.on_hand += line.quantity
        _ledger(db, row, T.RETURN, line.quantity, order_id=order_id, actor_id=actor_id)
    db.flush()
