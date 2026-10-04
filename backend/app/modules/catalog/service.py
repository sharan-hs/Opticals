"""Turns catalogue rows into storefront responses."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.core.pagination import Page, PageParams
from app.models import Brand, Category, Product, ProductImage, ProductVariant
from app.models.enums import ColorFamily, FrameMaterial, FrameShape, FrameType, Gender
from app.modules.catalog import queries
from app.modules.catalog.schemas import (
    BrandRef,
    CategoryNode,
    CategoryRef,
    ColorSwatch,
    Facets,
    FacetValue,
    ImageOut,
    PriceRange,
    ProductCard,
    ProductDetail,
    VariantOut,
)
from app.modules.inventory.availability import Availability, best, bucket


def discount_pct(mrp: int, price: int) -> int:
    return round(100 * (mrp - price) / mrp) if mrp > price else 0


def _active_variants(product: Product) -> list[ProductVariant]:
    return [v for v in product.variants if v.is_active and v.deleted_at is None]


def _availability(variant: ProductVariant) -> Availability:
    inventory = variant.inventory
    if inventory is None:
        return "out"
    return bucket(inventory.on_hand - inventory.reserved, inventory.low_stock_threshold)


def _sorted_images(images: list[ProductImage]) -> list[ProductImage]:
    return sorted(images, key=lambda i: (not i.is_primary, i.sort_order, i.id))


def _primary_image(product: Product, variants: list[ProductVariant]) -> ProductImage | None:
    for variant in variants:
        if variant.images:
            return _sorted_images(variant.images)[0]
    shared = [i for i in product.images if i.variant_id is None]
    return _sorted_images(shared)[0] if shared else None


def to_card(product: Product) -> ProductCard:
    variants = _active_variants(product)
    cheapest = min(variants, key=lambda v: (v.price_paise, v.sort_order))
    image = _primary_image(product, variants)
    return ProductCard(
        id=product.id,
        slug=product.slug,
        name=product.name,
        model_number=product.model_number,
        brand=BrandRef.model_validate(product.brand),
        category=CategoryRef.model_validate(product.category),
        price_paise=cheapest.price_paise,
        mrp_paise=cheapest.mrp_paise,
        discount_pct=discount_pct(cheapest.mrp_paise, cheapest.price_paise),
        image=ImageOut.model_validate(image) if image else None,
        colors=[ColorSwatch(name=v.color_name, hex=v.color_hex, sku=v.sku) for v in variants],
        availability=best([_availability(v) for v in variants]),
    )


def to_detail(product: Product) -> ProductDetail:
    card = to_card(product)
    variants = _active_variants(product)
    return ProductDetail(
        **card.model_dump(),
        description=product.description,
        specifications=product.specifications or [],
        gender=product.gender,
        frame_type=product.frame_type,
        frame_shape=product.frame_shape,
        frame_material=product.frame_material,
        variants=[
            VariantOut(
                id=v.id,
                sku=v.sku,
                color_name=v.color_name,
                color_family=v.color_family,
                color_hex=v.color_hex,
                size_label=v.size_label,
                lens_width_mm=v.lens_width_mm,
                bridge_mm=v.bridge_mm,
                temple_mm=v.temple_mm,
                mrp_paise=v.mrp_paise,
                price_paise=v.price_paise,
                discount_pct=discount_pct(v.mrp_paise, v.price_paise),
                availability=_availability(v),
                images=[ImageOut.model_validate(i) for i in _sorted_images(v.images)],
            )
            for v in variants
        ],
        images=[
            ImageOut.model_validate(i)
            for i in _sorted_images([i for i in product.images if i.variant_id is None])
        ],
    )


def list_products(
    db: Session, filters: queries.Filters, sort: str, params: PageParams
) -> Page[ProductCard]:
    rows, total = queries.list_products(db, filters, sort, params.offset, params.limit)
    return Page[ProductCard].create([to_card(p) for p in rows], total, params)


def get_product(db: Session, slug: str) -> ProductDetail:
    product = queries.get_visible(db, slug)
    if product is None:
        raise NotFoundError("Product not found.")
    return to_detail(product)


def related_products(db: Session, slug: str, limit: int) -> list[ProductCard]:
    product = queries.get_visible(db, slug)
    if product is None:
        raise NotFoundError("Product not found.")
    return [to_card(p) for p in queries.related(db, product, limit)]


def _label(value: str) -> str:
    return value.replace("_", " ").title()


def _enum_facet(
    rows: list[tuple[Any, int]],
    enum: type[ColorFamily | Gender | FrameShape | FrameType | FrameMaterial],
) -> list[FacetValue]:
    counts = {str(value): count for value, count in rows}
    return [
        FacetValue(value=member.value, label=_label(member.value), count=counts[member.value])
        for member in enum
        if member.value in counts
    ]


def facets(db: Session, filters: queries.Filters) -> Facets:
    categories = {c.id: c for c in db.scalars(select(Category))}
    category_counts: dict[int, int] = {}
    for category_id, count in queries.facet_counts(db, filters, Category.id, "category"):
        assert isinstance(category_id, int)  # noqa: S101
        category_counts[category_id] = count

    brand_names = {b.slug: b.name for b in db.scalars(select(Brand))}
    brand_rows = queries.facet_counts(db, filters, Brand.slug, "brand")
    price = queries.price_range(db, filters)
    return Facets(
        categories=[
            FacetValue(value=categories[cid].slug, label=categories[cid].name, count=count)
            for cid, count in sorted(
                category_counts.items(), key=lambda item: categories[item[0]].sort_order
            )
        ],
        brands=sorted(
            (
                FacetValue(value=str(slug), label=brand_names[str(slug)], count=count)
                for slug, count in brand_rows
            ),
            key=lambda f: f.label,
        ),
        colors=_enum_facet(queries.color_facet(db, filters), ColorFamily),
        genders=_enum_facet(queries.facet_counts(db, filters, Product.gender, "gender"), Gender),
        frame_shapes=_enum_facet(
            queries.facet_counts(db, filters, Product.frame_shape, "frame_shape"), FrameShape
        ),
        frame_types=_enum_facet(
            queries.facet_counts(db, filters, Product.frame_type, "frame_type"), FrameType
        ),
        materials=_enum_facet(
            queries.facet_counts(db, filters, Product.frame_material, "material"), FrameMaterial
        ),
        price=PriceRange(min=price[0], max=price[1]) if price else None,
    )


def category_tree(db: Session) -> list[CategoryNode]:
    rows = db.scalars(
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.sort_order, Category.name)
    ).all()
    children: dict[int | None, list[Category]] = {}
    for row in rows:
        children.setdefault(row.parent_id, []).append(row)

    def node(category: Category) -> CategoryNode:
        return CategoryNode(
            slug=category.slug,
            name=category.name,
            description=category.description,
            image_public_id=category.image_public_id,
            children=[node(c) for c in children.get(category.id, [])],
        )

    return [node(c) for c in children.get(None, [])]


def brands(db: Session) -> list[BrandRef]:
    rows = db.scalars(select(Brand).where(Brand.is_active.is_(True)).order_by(Brand.name))
    return [BrandRef.model_validate(b) for b in rows]
