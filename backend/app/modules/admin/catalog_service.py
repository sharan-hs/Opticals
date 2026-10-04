"""Admin catalogue: products, variants (colours), images, categories, brands.
Every write is recorded in the audit log."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import ColumnElement, and_, delete, exists, func, select, update
from sqlalchemy.orm import Session, selectinload

from app.core import audit
from app.core.config import get_settings
from app.core.errors import BusinessRuleError, ConflictError, NotFoundError
from app.core.pagination import Page, PageParams
from app.core.slugs import unique_slug
from app.models import (
    Brand,
    CartItem,
    Category,
    Inventory,
    Product,
    ProductImage,
    ProductVariant,
    User,
)
from app.models.enums import InventoryTransactionType, ProductStatus
from app.modules.admin.schemas import (
    AdminBrandOut,
    AdminCategoryOut,
    AdminImageOut,
    AdminProductOut,
    AdminProductRow,
    AdminVariantOut,
    BrandCreate,
    BrandFields,
    CategoryCreate,
    CategoryFields,
    ImageCreate,
    ImageUpdate,
    ProductCreate,
    ProductUpdate,
    Spec,
    StockFilter,
    VariantCreate,
    VariantUpdate,
)
from app.modules.catalog.schemas import ImageOut
from app.modules.inventory import service as inventory
from app.modules.inventory.availability import Availability, bucket
from app.modules.media import cloudinary

PRODUCT_FIELDS = [
    "name",
    "slug",
    "brand_id",
    "category_id",
    "gender",
    "frame_type",
    "frame_shape",
    "frame_material",
    "model_number",
    "description",
    "specifications",
    "hsn_code",
    "status",
    "is_featured",
]
VARIANT_FIELDS = [
    "sku",
    "color_name",
    "color_family",
    "color_hex",
    "size_label",
    "lens_width_mm",
    "bridge_mm",
    "temple_mm",
    "mrp_paise",
    "price_paise",
    "weight_grams",
    "is_active",
    "sort_order",
]


def _now() -> datetime:
    return datetime.now(UTC)


# --- loading ----------------------------------------------------------------


def _get_product(db: Session, product_id: int) -> Product:
    product = db.scalar(
        select(Product)
        .where(Product.id == product_id, Product.deleted_at.is_(None))
        .options(
            selectinload(Product.variants).selectinload(ProductVariant.inventory),
            selectinload(Product.images),
        )
        # Reload collections even if this session already holds the product
        # (e.g. right after creating it or adding a variant).
        .execution_options(populate_existing=True)
    )
    if product is None:
        raise NotFoundError("Product not found.")
    return product


def _get_variant(db: Session, variant_id: int) -> ProductVariant:
    variant = db.scalar(
        select(ProductVariant).where(
            ProductVariant.id == variant_id, ProductVariant.deleted_at.is_(None)
        )
    )
    if variant is None:
        raise NotFoundError("Colour/variant not found.")
    return variant


def _live_variants(product: Product) -> list[ProductVariant]:
    return [v for v in product.variants if v.deleted_at is None]


def _variant_out(variant: ProductVariant) -> AdminVariantOut:
    inv = variant.inventory
    on_hand, reserved, threshold = (
        (inv.on_hand, inv.reserved, inv.low_stock_threshold) if inv else (0, 0, 3)
    )
    return AdminVariantOut(
        id=variant.id,
        sku=variant.sku,
        color_name=variant.color_name,
        color_family=variant.color_family,
        color_hex=variant.color_hex,
        size_label=variant.size_label,
        lens_width_mm=variant.lens_width_mm,
        bridge_mm=variant.bridge_mm,
        temple_mm=variant.temple_mm,
        mrp_paise=variant.mrp_paise,
        price_paise=variant.price_paise,
        weight_grams=variant.weight_grams,
        is_active=variant.is_active,
        sort_order=variant.sort_order,
        on_hand=on_hand,
        reserved=reserved,
        available=on_hand - reserved,
        low_stock_threshold=threshold,
        availability=bucket(on_hand - reserved, threshold),
    )


def product_out(product: Product) -> AdminProductOut:
    return AdminProductOut(
        id=product.id,
        name=product.name,
        slug=product.slug,
        brand_id=product.brand_id,
        category_id=product.category_id,
        gender=product.gender,
        frame_type=product.frame_type,
        frame_shape=product.frame_shape,
        frame_material=product.frame_material,
        model_number=product.model_number,
        description=product.description,
        specifications=[Spec.model_validate(s) for s in product.specifications or []],
        hsn_code=product.hsn_code,
        status=product.status,
        is_featured=product.is_featured,
        created_at=product.created_at,
        updated_at=product.updated_at,
        variants=[
            _variant_out(v)
            for v in sorted(_live_variants(product), key=lambda v: (v.sort_order, v.id))
        ],
        images=[
            AdminImageOut.model_validate(i)
            for i in sorted(product.images, key=lambda i: (i.sort_order, i.id))
        ],
    )


def get_product(db: Session, product_id: int) -> AdminProductOut:
    return product_out(_get_product(db, product_id))


# --- product list -----------------------------------------------------------


def _live_variant_of_product() -> ColumnElement[bool]:
    return and_(
        ProductVariant.product_id == Product.id,
        ProductVariant.deleted_at.is_(None),
        ProductVariant.is_active.is_(True),
    )


def _total_available() -> ColumnElement[int]:
    return (
        select(func.coalesce(func.sum(Inventory.on_hand - Inventory.reserved), 0))
        .join(ProductVariant, ProductVariant.id == Inventory.variant_id)
        .where(_live_variant_of_product())
        .correlate(Product)
        .scalar_subquery()
    )


def _any_low() -> ColumnElement[bool]:
    return (
        exists()
        .where(
            _live_variant_of_product(),
            Inventory.variant_id == ProductVariant.id,
            Inventory.on_hand - Inventory.reserved <= Inventory.low_stock_threshold,
        )
        .correlate(Product)
    )


def list_products(
    db: Session,
    params: PageParams,
    *,
    q: str | None,
    category_id: int | None,
    brand_id: int | None,
    status: ProductStatus | None,
    stock: StockFilter | None,
    sort: str,
) -> Page[AdminProductRow]:
    query = select(Product).where(Product.deleted_at.is_(None))
    if q:
        like = f"%{q.strip()}%"
        query = query.where(
            Product.name.ilike(like)
            | Product.model_number.ilike(like)
            | exists().where(
                ProductVariant.product_id == Product.id, ProductVariant.sku.ilike(like)
            )
        )
    if category_id:
        children = select(Category.id).where(Category.parent_id == category_id)
        query = query.where(
            (Product.category_id == category_id) | Product.category_id.in_(children)
        )
    if brand_id:
        query = query.where(Product.brand_id == brand_id)
    if status:
        query = query.where(Product.status == status)
    total_available = _total_available()
    if stock == "out":
        query = query.where(total_available <= 0)
    elif stock == "low":
        query = query.where(total_available > 0, _any_low())
    elif stock == "in_stock":
        query = query.where(total_available > 0, ~_any_low())

    orders: dict[str, list[Any]] = {
        "name": [func.lower(Product.name)],
        "-updated": [Product.updated_at.desc()],
        "stock": [total_available.asc(), Product.id],
    }
    order = orders.get(sort, orders["-updated"])
    total = db.scalar(
        select(func.count()).select_from(query.with_only_columns(Product.id).subquery())
    )
    rows = db.scalars(
        query.order_by(*order, Product.id.desc())
        .offset(params.offset)
        .limit(params.limit)
        .options(
            selectinload(Product.brand),
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.variants).selectinload(ProductVariant.inventory),
        )
    ).all()
    return Page[AdminProductRow].create([_row(p) for p in rows], total or 0, params)


def _row(product: Product) -> AdminProductRow:
    live = [v for v in _live_variants(product) if v.is_active]
    outs = [_variant_out(v) for v in live]
    total = sum(max(v.available, 0) for v in outs)
    stock: Availability = (
        "out"
        if total <= 0
        else "low"
        if any(v.availability != "in_stock" for v in outs)
        else "in_stock"
    )
    images = sorted(product.images, key=lambda i: (not i.is_primary, i.sort_order, i.id))
    prices = [v.price_paise for v in live]
    return AdminProductRow(
        id=product.id,
        name=product.name,
        slug=product.slug,
        model_number=product.model_number,
        brand=product.brand.name,
        category=product.category.name,
        status=product.status,
        is_featured=product.is_featured,
        variant_count=len(live),
        min_price_paise=min(prices) if prices else None,
        max_price_paise=max(prices) if prices else None,
        total_available=total,
        stock_status=stock,
        image=ImageOut.model_validate(images[0]) if images else None,
        updated_at=product.updated_at,
    )


# --- product writes ---------------------------------------------------------


def _check_refs(db: Session, brand_id: int | None, category_id: int | None) -> None:
    if brand_id is not None and db.get(Brand, brand_id) is None:
        raise BusinessRuleError("Choose an existing brand.", code="UNKNOWN_BRAND")
    if category_id is not None and db.get(Category, category_id) is None:
        raise BusinessRuleError("Choose an existing category.", code="UNKNOWN_CATEGORY")


def _check_slug_free(db: Session, slug: str, exclude_id: int | None = None) -> None:
    query = select(Product.id).where(Product.slug == slug)
    if exclude_id:
        query = query.where(Product.id != exclude_id)
    if db.scalar(query) is not None:
        raise ConflictError("Another product already uses this URL name.", code="SLUG_TAKEN")


def _check_sku_free(db: Session, sku: str, exclude_id: int | None = None) -> None:
    query = select(ProductVariant.id).where(func.upper(ProductVariant.sku) == sku.upper())
    if exclude_id:
        query = query.where(ProductVariant.id != exclude_id)
    if db.scalar(query) is not None:
        raise ConflictError(f"SKU {sku} is already used.", code="SKU_TAKEN", details={"sku": sku})


def _check_can_activate(product: Product) -> None:
    if not any(v.is_active for v in _live_variants(product)):
        raise BusinessRuleError(
            "Add at least one active colour before publishing.", code="NO_ACTIVE_VARIANT"
        )


def _new_variant(
    db: Session, product: Product, data: VariantCreate, actor: User, order: int
) -> ProductVariant:
    _check_sku_free(db, data.sku)
    values = data.model_dump(exclude={"initial_stock"}, exclude_none=True)
    variant = ProductVariant(product_id=product.id, sort_order=order, **values)
    db.add(variant)
    db.flush()
    inventory.ensure_row(db, variant)
    if data.initial_stock:
        inventory.adjust(
            db,
            variant.id,
            InventoryTransactionType.RESTOCK,
            data.initial_stock,
            note="Opening stock",
            actor_id=actor.id,
        )
    return variant


def create_product(db: Session, actor: User, data: ProductCreate) -> AdminProductOut:
    _check_refs(db, data.brand_id, data.category_id)
    if data.slug:
        _check_slug_free(db, data.slug)
        slug = data.slug
    else:
        brand = db.get(Brand, data.brand_id)
        base = " ".join(filter(None, [brand.name if brand else "", data.name, data.model_number]))
        slug = unique_slug(db, Product.slug, base)
    skus = [v.sku.upper() for v in data.variants]
    if len(skus) != len(set(skus)):
        raise ConflictError("Each colour needs a different SKU.", code="SKU_TAKEN")

    fields = data.model_dump(exclude={"variants", "slug", "specifications"}, exclude_none=True)
    product = Product(
        slug=slug,
        specifications=[s.model_dump() for s in data.specifications or []],
        **fields,
    )
    db.add(product)
    db.flush()
    for order, variant_data in enumerate(data.variants):
        _new_variant(db, product, variant_data, actor, order)
    db.flush()
    product = _get_product(db, product.id)
    if product.status == ProductStatus.ACTIVE:
        _check_can_activate(product)
    audit.record(db, actor, "product.create", "product", product.id, {"name": product.name})
    db.commit()
    return product_out(product)


def update_product(
    db: Session, actor: User, product_id: int, data: ProductUpdate
) -> AdminProductOut:
    product = _get_product(db, product_id)
    changes = data.model_dump(exclude_unset=True)
    for required in ("name", "brand_id", "category_id", "gender", "status", "is_featured"):
        if changes.get(required, "") is None:
            changes.pop(required)  # can't be cleared
    _check_refs(db, changes.get("brand_id"), changes.get("category_id"))
    if changes.get("slug"):
        _check_slug_free(db, changes["slug"], exclude_id=product.id)
    if "specifications" in changes:
        changes["specifications"] = [s.model_dump() for s in data.specifications or []]

    before = audit.snapshot(product, PRODUCT_FIELDS)
    for field, value in changes.items():
        setattr(product, field, value)
    if product.status == ProductStatus.ACTIVE:
        _check_can_activate(product)
    audit.record(
        db,
        actor,
        "product.update",
        "product",
        product.id,
        audit.diff(before, audit.snapshot(product, PRODUCT_FIELDS)),
    )
    db.commit()
    return get_product(db, product.id)


def set_status(db: Session, actor: User, product_id: int, status: ProductStatus) -> AdminProductOut:
    return update_product(db, actor, product_id, ProductUpdate(status=status))


def _drop_from_carts(db: Session, variant_ids: list[int]) -> None:
    if variant_ids:
        db.execute(delete(CartItem).where(CartItem.variant_id.in_(variant_ids)))


def delete_product(db: Session, actor: User, product_id: int) -> None:
    """Hidden everywhere, kept for order history."""
    product = _get_product(db, product_id)
    product.deleted_at = _now()
    product.status = ProductStatus.INACTIVE
    _drop_from_carts(db, [v.id for v in product.variants])
    audit.record(db, actor, "product.delete", "product", product.id, {"name": product.name})
    db.commit()


# --- variant writes ---------------------------------------------------------


def create_variant(
    db: Session, actor: User, product_id: int, data: VariantCreate
) -> AdminProductOut:
    product = _get_product(db, product_id)
    order = max((v.sort_order for v in product.variants), default=-1) + 1
    variant = _new_variant(db, product, data, actor, order)
    audit.record(db, actor, "variant.create", "variant", variant.id, {"sku": variant.sku})
    db.commit()
    return get_product(db, product_id)


def update_variant(
    db: Session, actor: User, variant_id: int, data: VariantUpdate
) -> AdminProductOut:
    variant = _get_variant(db, variant_id)
    changes = data.model_dump(exclude_unset=True)
    for required in ("sku", "color_name", "mrp_paise", "price_paise", "is_active", "sort_order"):
        if changes.get(required, "") is None:
            changes.pop(required)
    if changes.get("sku"):
        _check_sku_free(db, changes["sku"], exclude_id=variant.id)
    mrp = changes.get("mrp_paise", variant.mrp_paise)
    price = changes.get("price_paise", variant.price_paise)
    if price > mrp:
        raise BusinessRuleError("Selling price can't be more than the MRP.", code="PRICE_ABOVE_MRP")

    before = audit.snapshot(variant, VARIANT_FIELDS)
    for field, value in changes.items():
        setattr(variant, field, value)
    if changes.get("is_active") is False:
        _drop_from_carts(db, [variant.id])
    audit.record(
        db,
        actor,
        "variant.update",
        "variant",
        variant.id,
        audit.diff(before, audit.snapshot(variant, VARIANT_FIELDS)),
    )
    db.commit()
    return get_product(db, variant.product_id)


def delete_variant(db: Session, actor: User, variant_id: int) -> AdminProductOut:
    variant = _get_variant(db, variant_id)
    variant.deleted_at = _now()
    variant.is_active = False
    _drop_from_carts(db, [variant.id])
    audit.record(db, actor, "variant.delete", "variant", variant.id, {"sku": variant.sku})
    db.commit()
    return get_product(db, variant.product_id)


# --- images -----------------------------------------------------------------


def upload_signature(db: Session, product_id: int) -> dict[str, Any]:
    product = _get_product(db, product_id)
    return cloudinary.upload_signature(f"products/{product.slug}")


def _clear_primary(db: Session, product_id: int, variant_id: int | None) -> None:
    db.execute(
        update(ProductImage)
        .where(
            ProductImage.product_id == product_id,
            ProductImage.variant_id.is_(None)
            if variant_id is None
            else ProductImage.variant_id == variant_id,
        )
        .values(is_primary=False)
    )
    db.flush()


def _check_variant_of(product: Product, variant_id: int | None) -> None:
    if variant_id is not None and variant_id not in {v.id for v in _live_variants(product)}:
        raise BusinessRuleError("That colour isn't part of this product.", code="UNKNOWN_VARIANT")


def add_image(db: Session, actor: User, product_id: int, data: ImageCreate) -> AdminProductOut:
    product = _get_product(db, product_id)
    _check_variant_of(product, data.variant_id)
    if db.scalar(select(ProductImage.id).where(ProductImage.public_id == data.public_id)):
        raise ConflictError("This image is already attached to a product.", code="IMAGE_EXISTS")

    image = ProductImage(
        product_id=product.id,
        variant_id=data.variant_id,
        public_id=data.public_id,
        alt_text=data.alt_text,
        version=data.version,
        width=data.width,
        height=data.height,
        format=data.format,
    )
    if get_settings().cloudinary_configured:
        asset = cloudinary.fetch_asset(data.public_id)  # the server's facts, not the browser's
        if asset.bytes > cloudinary.MAX_BYTES:
            raise BusinessRuleError("Images must be 10 MB or smaller.", code="IMAGE_TOO_LARGE")
        image.version, image.width, image.height = asset.version, asset.width, asset.height
        image.format, image.bytes = asset.format, asset.bytes

    siblings = [i for i in product.images if i.variant_id == data.variant_id]
    image.sort_order = max((i.sort_order for i in product.images), default=-1) + 1
    if data.is_primary or not siblings:
        _clear_primary(db, product.id, data.variant_id)
        image.is_primary = True
    db.add(image)
    db.flush()
    audit.record(db, actor, "image.add", "product", product.id, {"public_id": data.public_id})
    db.commit()
    return get_product(db, product.id)


def _get_image(db: Session, image_id: int) -> ProductImage:
    image = db.get(ProductImage, image_id)
    if image is None:
        raise NotFoundError("Image not found.")
    return image


def update_image(db: Session, actor: User, image_id: int, data: ImageUpdate) -> AdminProductOut:
    image = _get_image(db, image_id)
    product = _get_product(db, image.product_id)
    changes = data.model_dump(exclude_unset=True)
    if "variant_id" in changes:
        _check_variant_of(product, data.variant_id)
        if data.variant_id != image.variant_id:
            image.is_primary = False  # it may not be primary in its new group
            image.variant_id = data.variant_id
            db.flush()
    if "alt_text" in changes:
        image.alt_text = data.alt_text
    if data.is_primary:
        _clear_primary(db, image.product_id, image.variant_id)
        image.is_primary = True
    audit.record(
        db,
        actor,
        "image.update",
        "product",
        image.product_id,
        {"image_id": image.id, **{k: str(v) for k, v in changes.items()}},
    )
    db.commit()
    return get_product(db, image.product_id)


def reorder_images(
    db: Session, actor: User, product_id: int, image_ids: list[int]
) -> AdminProductOut:
    product = _get_product(db, product_id)
    current = {i.id for i in product.images}
    if set(image_ids) != current:
        raise BusinessRuleError("Send every image of this product exactly once.", code="BAD_ORDER")
    position = {image_id: n for n, image_id in enumerate(image_ids)}
    for image in product.images:
        image.sort_order = position[image.id]
    audit.record(db, actor, "image.reorder", "product", product.id, {"order": image_ids})
    db.commit()
    return get_product(db, product.id)


def delete_image(db: Session, actor: User, image_id: int) -> AdminProductOut:
    image = _get_image(db, image_id)
    product_id, variant_id, was_primary = image.product_id, image.variant_id, image.is_primary
    public_id = image.public_id
    db.delete(image)
    db.flush()
    if was_primary:  # promote the next image in the same group
        nxt = db.scalar(
            select(ProductImage)
            .where(
                ProductImage.product_id == product_id,
                ProductImage.variant_id.is_(None)
                if variant_id is None
                else ProductImage.variant_id == variant_id,
            )
            .order_by(ProductImage.sort_order, ProductImage.id)
            .limit(1)
        )
        if nxt is not None:
            nxt.is_primary = True
    audit.record(db, actor, "image.delete", "product", product_id, {"public_id": public_id})
    db.commit()
    cloudinary.destroy(public_id)
    return get_product(db, product_id)


# --- categories -------------------------------------------------------------


def list_categories(db: Session) -> list[AdminCategoryOut]:
    counts = dict(
        db.execute(
            select(Product.category_id, func.count())
            .where(Product.deleted_at.is_(None))
            .group_by(Product.category_id)
        ).all()
    )
    rows = db.scalars(select(Category).order_by(Category.sort_order, Category.name)).all()
    return [
        AdminCategoryOut.model_validate(c).model_copy(update={"product_count": counts.get(c.id, 0)})
        for c in rows
    ]


def _check_parent(db: Session, category: Category | None, parent_id: int | None) -> None:
    if parent_id is None:
        return
    parent = db.get(Category, parent_id)
    if parent is None:
        raise BusinessRuleError("Choose an existing parent category.", code="UNKNOWN_CATEGORY")
    if category is not None and parent.id == category.id:
        raise BusinessRuleError("A category can't be its own parent.", code="CATEGORY_CYCLE")
    if parent.parent_id is not None:
        raise BusinessRuleError("Subcategories can't have subcategories.", code="CATEGORY_DEPTH")
    if category is not None and db.scalar(
        select(Category.id).where(Category.parent_id == category.id).limit(1)
    ):
        raise BusinessRuleError(
            "This category has subcategories, so it must stay top-level.", code="CATEGORY_DEPTH"
        )


def _check_category_slug(db: Session, slug: str, exclude_id: int | None = None) -> None:
    query = select(Category.id).where(Category.slug == slug)
    if exclude_id:
        query = query.where(Category.id != exclude_id)
    if db.scalar(query):
        raise ConflictError("Another category already uses this URL name.", code="SLUG_TAKEN")


def create_category(db: Session, actor: User, data: CategoryCreate) -> AdminCategoryOut:
    _check_parent(db, None, data.parent_id)
    if data.slug:
        _check_category_slug(db, data.slug)
    slug = data.slug or unique_slug(db, Category.slug, data.name)
    category = Category(**data.model_dump(exclude={"slug"}, exclude_none=True), slug=slug)
    db.add(category)
    db.flush()
    audit.record(db, actor, "category.create", "category", category.id, {"name": category.name})
    db.commit()
    return AdminCategoryOut.model_validate(category)


def update_category(
    db: Session, actor: User, category_id: int, data: CategoryFields
) -> AdminCategoryOut:
    category = db.get(Category, category_id)
    if category is None:
        raise NotFoundError("Category not found.")
    changes = data.model_dump(exclude_unset=True)
    if "parent_id" in changes:
        _check_parent(db, category, changes["parent_id"])
    if changes.get("slug"):
        _check_category_slug(db, changes["slug"], exclude_id=category.id)
    for required in ("name", "slug", "sort_order", "is_active"):
        if changes.get(required, "") is None:
            changes.pop(required)
    fields = [
        "name",
        "slug",
        "parent_id",
        "description",
        "image_public_id",
        "sort_order",
        "is_active",
    ]
    before = audit.snapshot(category, fields)
    for field, value in changes.items():
        setattr(category, field, value)
    audit.record(
        db,
        actor,
        "category.update",
        "category",
        category.id,
        audit.diff(before, audit.snapshot(category, fields)),
    )
    db.commit()
    return AdminCategoryOut.model_validate(category)


def delete_category(db: Session, actor: User, category_id: int) -> None:
    category = db.get(Category, category_id)
    if category is None:
        raise NotFoundError("Category not found.")
    if db.scalar(select(Category.id).where(Category.parent_id == category.id).limit(1)):
        raise ConflictError("Delete or move its subcategories first.", code="CATEGORY_IN_USE")
    if db.scalar(select(Product.id).where(Product.category_id == category.id).limit(1)):
        raise ConflictError(
            "Products use this category; move them or deactivate the category instead.",
            code="CATEGORY_IN_USE",
        )
    audit.record(db, actor, "category.delete", "category", category.id, {"name": category.name})
    db.delete(category)
    db.commit()


# --- brands -----------------------------------------------------------------


def list_brands(db: Session) -> list[AdminBrandOut]:
    counts = dict(
        db.execute(
            select(Product.brand_id, func.count())
            .where(Product.deleted_at.is_(None))
            .group_by(Product.brand_id)
        ).all()
    )
    rows = db.scalars(select(Brand).order_by(Brand.name)).all()
    return [
        AdminBrandOut.model_validate(b).model_copy(update={"product_count": counts.get(b.id, 0)})
        for b in rows
    ]


def _check_brand_unique(
    db: Session, name: str | None, slug: str | None, exclude_id: int | None
) -> None:
    for column, value, label in ((Brand.name, name, "name"), (Brand.slug, slug, "URL name")):
        if value is None:
            continue
        query = select(Brand.id).where(column == value)
        if exclude_id:
            query = query.where(Brand.id != exclude_id)
        if db.scalar(query):
            raise ConflictError(f"Another brand already uses this {label}.", code="BRAND_TAKEN")


def create_brand(db: Session, actor: User, data: BrandCreate) -> AdminBrandOut:
    _check_brand_unique(db, data.name, data.slug, None)
    slug = data.slug or unique_slug(db, Brand.slug, data.name)
    brand = Brand(**data.model_dump(exclude={"slug"}, exclude_none=True), slug=slug)
    db.add(brand)
    db.flush()
    audit.record(db, actor, "brand.create", "brand", brand.id, {"name": brand.name})
    db.commit()
    return AdminBrandOut.model_validate(brand)


def update_brand(db: Session, actor: User, brand_id: int, data: BrandFields) -> AdminBrandOut:
    brand = db.get(Brand, brand_id)
    if brand is None:
        raise NotFoundError("Brand not found.")
    changes = {
        k: v
        for k, v in data.model_dump(exclude_unset=True).items()
        if not (v is None and k in {"name", "slug", "is_active"})
    }
    _check_brand_unique(db, changes.get("name"), changes.get("slug"), brand.id)
    fields = ["name", "slug", "logo_public_id", "is_active"]
    before = audit.snapshot(brand, fields)
    for field, value in changes.items():
        setattr(brand, field, value)
    audit.record(
        db,
        actor,
        "brand.update",
        "brand",
        brand.id,
        audit.diff(before, audit.snapshot(brand, fields)),
    )
    db.commit()
    return AdminBrandOut.model_validate(brand)


def delete_brand(db: Session, actor: User, brand_id: int) -> None:
    brand = db.get(Brand, brand_id)
    if brand is None:
        raise NotFoundError("Brand not found.")
    if db.scalar(select(Product.id).where(Product.brand_id == brand.id).limit(1)):
        raise ConflictError("Products use this brand; deactivate it instead.", code="BRAND_IN_USE")
    audit.record(db, actor, "brand.delete", "brand", brand.id, {"name": brand.name})
    db.delete(brand)
    db.commit()
