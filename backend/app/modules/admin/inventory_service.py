"""Admin views of stock: the stock list, low-stock list, and change history."""

from collections.abc import Sequence
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, aliased

from app.core import audit
from app.core.pagination import Page, PageParams
from app.models import (
    Category,
    Inventory,
    InventoryTransaction,
    Product,
    ProductImage,
    ProductVariant,
    User,
)
from app.models.enums import InventoryTransactionType
from app.modules.admin.schemas import (
    AdjustmentRequest,
    InventoryRow,
    StockFilter,
    TransactionRow,
)
from app.modules.catalog.schemas import ImageOut
from app.modules.inventory import service as inventory
from app.modules.inventory.availability import bucket

AVAILABLE = Inventory.on_hand - Inventory.reserved


def _rows_query() -> Select[Inventory, ProductVariant, Product]:
    return (
        select(Inventory, ProductVariant, Product)
        .join(ProductVariant, ProductVariant.id == Inventory.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .where(ProductVariant.deleted_at.is_(None), Product.deleted_at.is_(None))
    )


def _primary_images(db: Session, variant_ids: list[int]) -> dict[int, ProductImage]:
    if not variant_ids:
        return {}
    images = db.scalars(
        select(ProductImage)
        .where(ProductImage.variant_id.in_(variant_ids))
        .order_by(ProductImage.is_primary.desc(), ProductImage.sort_order)
    ).all()
    out: dict[int, ProductImage] = {}
    for image in images:
        if image.variant_id is not None:
            out.setdefault(image.variant_id, image)
    return out


def _to_row(
    inv: Inventory, variant: ProductVariant, product: Product, image: ProductImage | None
) -> InventoryRow:
    available = inv.on_hand - inv.reserved
    return InventoryRow(
        variant_id=variant.id,
        sku=variant.sku,
        color_name=variant.color_name,
        size_label=variant.size_label,
        product_id=product.id,
        product_name=product.name,
        product_slug=product.slug,
        product_status=product.status,
        variant_active=variant.is_active,
        image=ImageOut.model_validate(image) if image else None,
        on_hand=inv.on_hand,
        reserved=inv.reserved,
        available=available,
        low_stock_threshold=inv.low_stock_threshold,
        availability=bucket(available, inv.low_stock_threshold),
        updated_at=inv.updated_at,
    )


def _with_images(
    db: Session, rows: Sequence[tuple[Inventory, ProductVariant, Product]]
) -> list[InventoryRow]:
    images = _primary_images(db, [variant.id for _, variant, _ in rows])
    return [
        _to_row(inv, variant, product, images.get(variant.id)) for inv, variant, product in rows
    ]


def list_inventory(
    db: Session,
    params: PageParams,
    *,
    q: str | None,
    category_id: int | None,
    brand_id: int | None,
    stock: StockFilter | None,
    sort: str,
) -> Page[InventoryRow]:
    query = _rows_query()
    if q:
        like = f"%{q.strip()}%"
        query = query.where(
            or_(
                ProductVariant.sku.ilike(like),
                Product.name.ilike(like),
                Product.model_number.ilike(like),
                ProductVariant.color_name.ilike(like),
            )
        )
    if category_id:
        children = select(Category.id).where(Category.parent_id == category_id)
        query = query.where(
            or_(Product.category_id == category_id, Product.category_id.in_(children))
        )
    if brand_id:
        query = query.where(Product.brand_id == brand_id)
    if stock == "out":
        query = query.where(AVAILABLE <= 0)
    elif stock == "low":
        query = query.where(AVAILABLE > 0, Inventory.low_stock_threshold >= AVAILABLE)
    elif stock == "in_stock":
        query = query.where(Inventory.low_stock_threshold < AVAILABLE)

    orders: dict[str, list[Any]] = {
        "available": [AVAILABLE.asc()],
        "-available": [AVAILABLE.desc()],
        "name": [func.lower(Product.name), ProductVariant.sort_order],
        "-updated": [Inventory.updated_at.desc()],
    }
    order = orders.get(sort, orders["name"])
    total = db.scalar(
        select(func.count()).select_from(query.with_only_columns(Inventory.variant_id).subquery())
    )
    rows = db.execute(
        query.order_by(*order, ProductVariant.id).offset(params.offset).limit(params.limit)
    ).all()
    return Page[InventoryRow].create(_with_images(db, rows), total or 0, params)


def low_stock(db: Session, limit: int = 50) -> list[InventoryRow]:
    """Active colours of live products at or below their alert level."""
    rows = db.execute(
        _rows_query()
        .where(ProductVariant.is_active.is_(True), Inventory.low_stock_threshold >= AVAILABLE)
        .order_by(AVAILABLE.asc(), func.lower(Product.name))
        .limit(limit)
    ).all()
    return _with_images(db, rows)


def get_row(db: Session, variant_id: int) -> InventoryRow:
    row = db.execute(_rows_query().where(ProductVariant.id == variant_id)).one()
    return _with_images(db, [row])[0]


def adjust(db: Session, actor: User, variant_id: int, data: AdjustmentRequest) -> InventoryRow:
    before = inventory.lock(db, variant_id).on_hand
    after = inventory.adjust(
        db,
        variant_id,
        InventoryTransactionType(data.type),
        data.quantity_delta,
        note=data.note,
        actor_id=actor.id,
    ).on_hand
    audit.record(
        db,
        actor,
        "inventory.adjust",
        "variant",
        variant_id,
        {"on_hand": [before, after], "type": data.type, "note": data.note},
    )
    db.commit()
    return get_row(db, variant_id)


def mark_out_of_stock(db: Session, actor: User, variant_id: int, note: str) -> InventoryRow:
    before = inventory.lock(db, variant_id).on_hand
    after = inventory.mark_out_of_stock(db, variant_id, note=note, actor_id=actor.id).on_hand
    audit.record(
        db, actor, "inventory.mark_out", "variant", variant_id, {"on_hand": [before, after]}
    )
    db.commit()
    return get_row(db, variant_id)


def set_threshold(db: Session, actor: User, variant_id: int, threshold: int) -> InventoryRow:
    before = inventory.lock(db, variant_id).low_stock_threshold
    inventory.set_threshold(db, variant_id, threshold)
    audit.record(
        db,
        actor,
        "inventory.threshold",
        "variant",
        variant_id,
        {"low_stock_threshold": [before, threshold]},
    )
    db.commit()
    return get_row(db, variant_id)


def list_transactions(
    db: Session,
    params: PageParams,
    *,
    variant_id: int | None,
    q: str | None,
    type_: InventoryTransactionType | None,
    date_from: date | None,
    date_to: date | None,
) -> Page[TransactionRow]:
    actor = aliased(User)
    query = (
        select(InventoryTransaction, ProductVariant, Product, actor.full_name)
        .join(ProductVariant, ProductVariant.id == InventoryTransaction.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .outerjoin(actor, actor.id == InventoryTransaction.created_by)
    )
    if variant_id:
        query = query.where(InventoryTransaction.variant_id == variant_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.where(or_(ProductVariant.sku.ilike(like), Product.name.ilike(like)))
    if type_:
        query = query.where(InventoryTransaction.type == type_)
    # Dates are the shop's calendar days (India, UTC+5:30).
    ist = timedelta(hours=5, minutes=30)
    if date_from:
        start = datetime.combine(date_from, time.min, UTC) - ist
        query = query.where(InventoryTransaction.created_at >= start)
    if date_to:
        end = datetime.combine(date_to + timedelta(days=1), time.min, UTC) - ist
        query = query.where(InventoryTransaction.created_at < end)

    total = db.scalar(
        select(func.count()).select_from(
            query.with_only_columns(InventoryTransaction.id).subquery()
        )
    )
    rows = db.execute(
        query.order_by(InventoryTransaction.created_at.desc(), InventoryTransaction.id.desc())
        .offset(params.offset)
        .limit(params.limit)
    ).all()
    items = [
        TransactionRow(
            id=tx.id,
            created_at=tx.created_at,
            type=tx.type,
            quantity_delta=tx.quantity_delta,
            on_hand_after=tx.on_hand_after,
            note=tx.note,
            order_id=tx.order_id,
            variant_id=variant.id,
            sku=variant.sku,
            product_name=product.name,
            color_name=variant.color_name,
            created_by=actor_name,
        )
        for tx, variant, product, actor_name in rows
    ]
    return Page[TransactionRow].create(items, total or 0, params)
