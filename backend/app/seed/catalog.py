"""Idempotent seeding: running it again updates catalogue details but never
touches stock counts or settings someone has already changed."""

from dataclasses import dataclass

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.money import rupees_to_paise
from app.models import (
    Brand,
    Category,
    Inventory,
    Product,
    ProductImage,
    ProductVariant,
    StoreSetting,
)
from app.models.enums import Gender, ProductStatus
from app.seed.data import BRANDS, CATEGORIES, PRODUCTS, STORE_SETTINGS, ProductSeed, VariantSeed

# Tables cleared by `seed --reset` (development only). CASCADE also clears rows
# that point at them, e.g. cart items and test orders' items.
RESET_TABLES = [
    "product_images",
    "inventory_transactions",
    "inventory",
    "product_variants",
    "products",
    "brands",
    "categories",
    "store_settings",
]


@dataclass
class SeedSummary:
    categories: int = 0
    brands: int = 0
    products: int = 0
    variants: int = 0
    images: int = 0
    settings: int = 0


def reset_catalogue(db: Session) -> None:
    db.execute(text(f"TRUNCATE {', '.join(RESET_TABLES)} RESTART IDENTITY CASCADE"))


def seed_catalogue(db: Session) -> SeedSummary:
    summary = SeedSummary()
    categories = _seed_categories(db, summary)
    brands = _seed_brands(db, summary)
    for product_seed in PRODUCTS:
        _seed_product(db, product_seed, brands, categories, summary)
    _seed_settings(db, summary)
    db.flush()
    return summary


def _seed_categories(db: Session, summary: SeedSummary) -> dict[str, Category]:
    by_slug = {c.slug: c for c in db.scalars(select(Category))}

    def upsert(name: str, slug: str, parent: Category | None, order: int) -> Category:
        category = by_slug.get(slug)
        if category is None:
            category = Category(slug=slug)
            db.add(category)
            by_slug[slug] = category
            summary.categories += 1
        category.name = name
        category.parent_id = parent.id if parent else None
        category.sort_order = order
        db.flush()
        return category

    for order, (name, slug, children) in enumerate(CATEGORIES):
        parent = upsert(name, slug, None, order)
        for child_order, (child_name, child_slug) in enumerate(children):
            upsert(child_name, child_slug, parent, child_order)
    return by_slug


def _seed_brands(db: Session, summary: SeedSummary) -> dict[str, Brand]:
    by_slug = {b.slug: b for b in db.scalars(select(Brand))}
    for name, slug in BRANDS:
        if slug not in by_slug:
            by_slug[slug] = Brand(name=name, slug=slug)
            db.add(by_slug[slug])
            summary.brands += 1
    db.flush()
    return by_slug


def _seed_product(
    db: Session,
    seed: ProductSeed,
    brands: dict[str, Brand],
    categories: dict[str, Category],
    summary: SeedSummary,
) -> None:
    product = db.scalar(select(Product).where(Product.slug == seed.slug))
    if product is None:
        product = Product(slug=seed.slug, status=ProductStatus.ACTIVE, is_featured=True)
        db.add(product)
        summary.products += 1
    product.name = seed.name
    product.model_number = seed.model_number
    product.brand_id = brands[seed.brand_slug].id
    product.category_id = categories[seed.category_slug].id
    product.gender = Gender.UNISEX
    product.frame_shape = seed.frame_shape
    product.frame_material = seed.frame_material
    product.hsn_code = seed.hsn_code
    product.specifications = seed.specifications
    db.flush()

    for order, variant_seed in enumerate(seed.variants):
        variant = _seed_variant(db, product, variant_seed, order, summary)
        _seed_images(db, product, variant, variant_seed, brands[seed.brand_slug].name, summary)


def _seed_variant(
    db: Session, product: Product, seed: VariantSeed, order: int, summary: SeedSummary
) -> ProductVariant:
    variant = db.scalar(
        select(ProductVariant).where(func.upper(ProductVariant.sku) == seed.sku.upper())
    )
    if variant is None:
        variant = ProductVariant(sku=seed.sku)
        db.add(variant)
        summary.variants += 1
    price = rupees_to_paise(seed.price_rupees)
    variant.product_id = product.id
    variant.color_name = seed.color_name
    variant.color_family = seed.color_family
    variant.color_hex = seed.color_hex
    variant.mrp_paise = price
    variant.price_paise = price
    variant.sort_order = order
    db.flush()

    # Stock row starts at 0; existing counts are never overwritten.
    if db.get(Inventory, variant.id) is None:
        db.add(Inventory(variant_id=variant.id))
    return variant


def _seed_images(
    db: Session,
    product: Product,
    variant: ProductVariant,
    seed: VariantSeed,
    brand_name: str,
    summary: SeedSummary,
) -> None:
    existing = {
        image.public_id: image
        for image in db.scalars(select(ProductImage).where(ProductImage.variant_id == variant.id))
    }
    for n in range(1, seed.image_count + 1):
        public_id = f"Products/{seed.image_folder}/{seed.image_folder}_{n}"
        image = existing.get(public_id)
        if image is None:
            image = ProductImage(public_id=public_id, product_id=product.id, variant_id=variant.id)
            db.add(image)
            summary.images += 1
        image.format = "png"
        image.version = seed.image_version
        image.sort_order = n - 1
        image.is_primary = n == 1
        image.alt_text = f"{brand_name} {product.name} in {seed.color_name}, view {n}"


def _seed_settings(db: Session, summary: SeedSummary) -> None:
    for key, value in STORE_SETTINGS.items():
        if db.get(StoreSetting, key) is None:
            db.add(StoreSetting(key=key, value=value))
            summary.settings += 1
