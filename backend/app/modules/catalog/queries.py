"""Read queries for the storefront. A product is visible when it is ACTIVE,
not deleted, its brand and category (and parent category) are active, and it
has at least one active colour."""

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import (
    ColumnElement,
    Select,
    and_,
    case,
    distinct,
    func,
    or_,
    select,
)
from sqlalchemy.orm import InstrumentedAttribute, Session, aliased, selectinload

from app.models import Brand, Category, Inventory, Product, ProductVariant
from app.models.enums import (
    ColorFamily,
    FrameMaterial,
    FrameShape,
    FrameType,
    Gender,
    ProductStatus,
)

ParentCategory = aliased(Category)


def active_variant(
    product_id: ColumnElement[int] | InstrumentedAttribute[int] | None = None,
) -> ColumnElement[bool]:
    conditions: list[ColumnElement[bool]] = [
        ProductVariant.is_active.is_(True),
        ProductVariant.deleted_at.is_(None),
    ]
    if product_id is not None:
        conditions.append(ProductVariant.product_id == product_id)
    return and_(*conditions)


def variant_exists(*conditions: ColumnElement[bool]) -> ColumnElement[bool]:
    """EXISTS over this product's active variants. Correlated to Product only,
    so it stays correct when the outer query also joins variants (facets)."""
    query = select(ProductVariant.id).where(active_variant(Product.id), *conditions)
    return query.correlate(Product).exists()


def min_price_column() -> ColumnElement[int]:
    return (
        select(func.min(ProductVariant.price_paise))
        .where(active_variant(Product.id))
        .correlate(Product)
        .scalar_subquery()
    )


def visible_products() -> Select[Product]:
    # select_from keeps Product as the FROM when facets swap the columns.
    return (
        select(Product)
        .select_from(Product)
        .join(Brand, Brand.id == Product.brand_id)
        .join(Category, Category.id == Product.category_id)
        .outerjoin(ParentCategory, ParentCategory.id == Category.parent_id)
        .where(
            Product.status == ProductStatus.ACTIVE,
            Product.deleted_at.is_(None),
            Brand.is_active.is_(True),
            Category.is_active.is_(True),
            or_(Category.parent_id.is_(None), ParentCategory.is_active.is_(True)),
            variant_exists(),
        )
    )


@dataclass
class Filters:
    q: str | None = None
    category: str | None = None
    brands: list[str] = field(default_factory=list)
    colors: list[ColorFamily] = field(default_factory=list)
    genders: list[Gender] = field(default_factory=list)
    frame_shapes: list[FrameShape] = field(default_factory=list)
    frame_types: list[FrameType] = field(default_factory=list)
    materials: list[FrameMaterial] = field(default_factory=list)
    min_price: int | None = None  # rupees
    max_price: int | None = None
    in_stock: bool = False


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search_condition(q: str) -> ColumnElement[bool]:
    query = func.websearch_to_tsquery("english", q)
    prefix = f"{_escape_like(q)}%"
    return or_(
        Product.search_vector.op("@@")(query),
        func.similarity(Product.name, q) > 0.3,
        Product.model_number.ilike(prefix),
        Brand.name.ilike(f"%{_escape_like(q)}%"),
        variant_exists(ProductVariant.sku.ilike(prefix)),
    )


def relevance(q: str) -> ColumnElement[float]:
    return func.ts_rank(
        Product.search_vector, func.websearch_to_tsquery("english", q)
    ) + func.similarity(Product.name, q)


def _category_ids(db: Session, slug: str) -> list[int]:
    """A category and its subcategories."""
    root = db.scalar(select(Category.id).where(Category.slug == slug))
    if root is None:
        return []
    children = db.scalars(select(Category.id).where(Category.parent_id == root)).all()
    return [root, *children]


def conditions(db: Session, filters: Filters) -> dict[str, ColumnElement[bool]]:
    """Named so facet counts can leave out their own filter."""
    out: dict[str, ColumnElement[bool]] = {}
    if filters.q:
        out["q"] = search_condition(filters.q)
    if filters.category:
        out["category"] = Product.category_id.in_(_category_ids(db, filters.category) or [-1])
    if filters.brands:
        out["brand"] = Brand.slug.in_(filters.brands)
    if filters.genders:
        out["gender"] = Product.gender.in_(filters.genders)
    if filters.frame_shapes:
        out["frame_shape"] = Product.frame_shape.in_(filters.frame_shapes)
    if filters.frame_types:
        out["frame_type"] = Product.frame_type.in_(filters.frame_types)
    if filters.materials:
        out["material"] = Product.frame_material.in_(filters.materials)
    if filters.colors:
        out["color"] = variant_exists(ProductVariant.color_family.in_(filters.colors))
    price_conditions = []
    if filters.min_price is not None:
        price_conditions.append(min_price_column() >= filters.min_price * 100)
    if filters.max_price is not None:
        price_conditions.append(min_price_column() <= filters.max_price * 100)
    if price_conditions:
        out["price"] = and_(*price_conditions)
    if filters.in_stock:
        in_stock = (
            select(Inventory.variant_id)
            .where(
                Inventory.variant_id == ProductVariant.id,
                Inventory.on_hand - Inventory.reserved > 0,
            )
            .correlate(ProductVariant)
            .exists()
        )
        out["in_stock"] = variant_exists(in_stock)
    return out


def order_by(sort: str, q: str | None) -> list[Any]:
    featured: list[Any] = [Product.is_featured.desc(), Product.created_at.desc(), Product.id.desc()]
    match sort:
        case "relevance" if q:
            return [relevance(q).desc(), *featured]
        case "newest":
            return [Product.created_at.desc(), Product.id.desc()]
        case "price_asc":
            return [min_price_column().asc(), Product.id]
        case "price_desc":
            return [min_price_column().desc(), Product.id]
        case "name_asc":
            return [func.lower(Product.name).asc(), Product.id]
        case "name_desc":
            return [func.lower(Product.name).desc(), Product.id]
        case _:
            return featured


def with_card_data(query: Select[Product]) -> Select[Product]:
    return query.options(
        selectinload(Product.brand),
        selectinload(Product.category),
        selectinload(Product.images),
        selectinload(Product.variants).selectinload(ProductVariant.inventory),
        selectinload(Product.variants).selectinload(ProductVariant.images),
    )


def list_products(
    db: Session, filters: Filters, sort: str, offset: int, limit: int
) -> tuple[Sequence[Product], int]:
    where = list(conditions(db, filters).values())
    base = visible_products().where(*where)
    total = db.scalar(
        select(func.count()).select_from(base.with_only_columns(Product.id).subquery())
    )
    rows = db.scalars(
        with_card_data(base.order_by(*order_by(sort, filters.q)).offset(offset).limit(limit))
    ).all()
    return rows, total or 0


def facet_counts(db: Session, filters: Filters, column: Any, skip: str) -> list[tuple[Any, int]]:
    """Distinct products per value of `column`, with every filter except `skip`."""
    where = [c for name, c in conditions(db, filters).items() if name != skip]
    query = (
        visible_products()
        .with_only_columns(column, func.count(distinct(Product.id)))
        .where(*where, column.is_not(None))
        .group_by(column)
    )
    return [(value, count) for value, count in db.execute(query).all()]


def color_facet(db: Session, filters: Filters) -> list[tuple[Any, int]]:
    where = [c for name, c in conditions(db, filters).items() if name != "color"]
    query = (
        visible_products()
        .join(ProductVariant, active_variant(Product.id))
        .with_only_columns(ProductVariant.color_family, func.count(distinct(Product.id)))
        .where(*where, ProductVariant.color_family.is_not(None))
        .group_by(ProductVariant.color_family)
    )
    return [(value, count) for value, count in db.execute(query).all()]


def price_range(db: Session, filters: Filters) -> tuple[int, int] | None:
    where = [c for name, c in conditions(db, filters).items() if name != "price"]
    prices = visible_products().where(*where).with_only_columns(min_price_column().label("p"))
    sub = prices.subquery()
    low, high = db.execute(select(func.min(sub.c.p), func.max(sub.c.p))).one()
    if low is None:
        return None
    return int(low) // 100, -(-int(high) // 100)  # rupees, rounded outwards


def get_visible(db: Session, slug: str) -> Product | None:
    return db.scalar(with_card_data(visible_products().where(Product.slug == slug)))


def related(db: Session, product: Product, limit: int) -> Sequence[Product]:
    same_category = case((Product.category_id == product.category_id, 1), else_=0)
    same_brand = case((Product.brand_id == product.brand_id, 1), else_=0)
    query = (
        visible_products()
        .where(
            Product.id != product.id,
            or_(Product.category_id == product.category_id, Product.brand_id == product.brand_id),
        )
        .order_by(
            (same_category + same_brand).desc(),
            Product.is_featured.desc(),
            Product.created_at.desc(),
        )
        .limit(limit)
    )
    return db.scalars(with_card_data(query)).all()
