"""Catalogue: a Product is a frame design; each ProductVariant is a sellable
colour/size with its own SKU, price and stock."""

from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Computed,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import CITEXT, JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    CreatedAtMixin,
    SoftDeleteMixin,
    TimestampMixin,
    enum_column,
    id_column,
)
from app.models.enums import (
    ColorFamily,
    FrameMaterial,
    FrameShape,
    FrameType,
    Gender,
    ProductStatus,
)

if TYPE_CHECKING:
    from app.models.inventory import Inventory

SLUG_CHECK = "{column} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'"


class Category(TimestampMixin, Base):
    """Two levels: top-level categories and their subcategories."""

    __tablename__ = "categories"

    id: Mapped[int] = id_column()
    parent_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    image_public_id: Mapped[str | None] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())

    parent: Mapped["Category | None"] = relationship(
        back_populates="children", remote_side=[id], lazy="raise"
    )
    children: Mapped[list["Category"]] = relationship(back_populates="parent", lazy="raise")

    __table_args__ = (
        # NULLS NOT DISTINCT: two top-level categories can't share a name either.
        UniqueConstraint("parent_id", "name", postgresql_nulls_not_distinct=True),
        CheckConstraint("parent_id <> id", name="not_own_parent"),
        CheckConstraint(SLUG_CHECK.format(column="slug"), name="slug_format"),
    )


class Brand(TimestampMixin, Base):
    __tablename__ = "brands"

    id: Mapped[int] = id_column()
    name: Mapped[str] = mapped_column(CITEXT, unique=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    logo_public_id: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())

    __table_args__ = (CheckConstraint(SLUG_CHECK.format(column="slug"), name="slug_format"),)


class Product(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "products"

    id: Mapped[int] = id_column()
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(220), unique=True)
    brand_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("brands.id", ondelete="RESTRICT"), index=True
    )
    category_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="RESTRICT"), index=True
    )
    gender: Mapped[Gender] = enum_column(
        Gender, length=10, default=Gender.UNISEX, server_default=Gender.UNISEX.value
    )
    # Frame attributes don't change between colourways; NULL for lenses/accessories.
    frame_type: Mapped[FrameType | None] = enum_column(FrameType)
    frame_shape: Mapped[FrameShape | None] = enum_column(FrameShape)
    frame_material: Mapped[FrameMaterial | None] = enum_column(FrameMaterial)
    model_number: Mapped[str | None] = mapped_column(String(50))
    # Plain text / markdown, never raw HTML.
    description: Mapped[str | None] = mapped_column(Text)
    # [{"label": "Lens width", "value": "54 mm"}, ...]
    specifications: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb")
    )
    hsn_code: Mapped[str | None] = mapped_column(String(8))
    status: Mapped[ProductStatus] = enum_column(
        ProductStatus,
        length=10,
        default=ProductStatus.DRAFT,
        server_default=ProductStatus.DRAFT.value,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    search_vector: Mapped[str] = mapped_column(
        TSVECTOR,
        Computed(
            "setweight(to_tsvector('english', coalesce(name, '')), 'A') || "
            "setweight(to_tsvector('simple', coalesce(model_number, '')), 'A') || "
            "setweight(to_tsvector('english', coalesce(description, '')), 'B')",
            persisted=True,
        ),
    )
    created_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL")
    )

    brand: Mapped[Brand] = relationship(lazy="raise")
    category: Mapped[Category] = relationship(lazy="raise")
    variants: Mapped[list["ProductVariant"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductVariant.sort_order",
        lazy="raise",
    )
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
        lazy="raise",
    )

    __table_args__ = (
        CheckConstraint(SLUG_CHECK.format(column="slug"), name="slug_format"),
        CheckConstraint("hsn_code ~ '^[0-9]{4,8}$'", name="hsn_code_digits"),
        CheckConstraint("jsonb_typeof(specifications) = 'array'", name="specifications_is_array"),
        Index("ix_products_status_category", "status", "category_id"),
        Index("ix_products_gender", "gender"),
        Index("ix_products_frame_shape", "frame_shape"),
        Index("ix_products_created_at", text("created_at DESC")),
        Index("ix_products_search_vector", "search_vector", postgresql_using="gin"),
        Index(
            "ix_products_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
    )


class ProductVariant(TimestampMixin, SoftDeleteMixin, Base):
    """A sellable SKU: one colour (and size) of a product."""

    __tablename__ = "product_variants"

    id: Mapped[int] = id_column()
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    sku: Mapped[str] = mapped_column(String(40))
    color_name: Mapped[str] = mapped_column(String(40))
    color_family: Mapped[ColorFamily | None] = enum_column(ColorFamily)
    color_hex: Mapped[str | None] = mapped_column(String(7))
    size_label: Mapped[str | None] = mapped_column(String(20))
    lens_width_mm: Mapped[int | None] = mapped_column(SmallInteger)
    bridge_mm: Mapped[int | None] = mapped_column(SmallInteger)
    temple_mm: Mapped[int | None] = mapped_column(SmallInteger)
    # MRP must be displayed in India; the selling price can't exceed it.
    mrp_paise: Mapped[int] = mapped_column(BigInteger)
    price_paise: Mapped[int] = mapped_column(BigInteger)
    weight_grams: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")

    product: Mapped[Product] = relationship(back_populates="variants", lazy="raise")
    inventory: Mapped["Inventory"] = relationship(
        back_populates="variant", uselist=False, cascade="all, delete-orphan", lazy="raise"
    )
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="variant", order_by="ProductImage.sort_order", lazy="raise"
    )

    __table_args__ = (
        CheckConstraint("mrp_paise > 0", name="mrp_positive"),
        CheckConstraint("price_paise > 0 AND price_paise <= mrp_paise", name="price_within_mrp"),
        CheckConstraint("color_hex ~ '^#[0-9A-Fa-f]{6}$'", name="color_hex_format"),
        CheckConstraint("sku ~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'", name="sku_format"),
        CheckConstraint(
            "coalesce(lens_width_mm, 1) > 0 AND coalesce(bridge_mm, 1) > 0 "
            "AND coalesce(temple_mm, 1) > 0",
            name="dimensions_positive",
        ),
        UniqueConstraint(
            "product_id", "color_name", "size_label", postgresql_nulls_not_distinct=True
        ),
    )


# SKUs are unique regardless of case ("rb4349-710" == "RB4349-710").
Index("uq_product_variants_upper_sku", func.upper(ProductVariant.sku), unique=True)


class ProductImage(CreatedAtMixin, Base):
    """A Cloudinary image. Only identifiers are stored; URLs are built when needed."""

    __tablename__ = "product_images"

    id: Mapped[int] = id_column()
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    # Set for colour-specific images; NULL means the image applies to every colour.
    variant_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("product_variants.id", ondelete="CASCADE"), index=True
    )
    public_id: Mapped[str] = mapped_column(String(255), unique=True)
    version: Mapped[int | None] = mapped_column(BigInteger)
    format: Mapped[str | None] = mapped_column(String(10))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    bytes: Mapped[int | None] = mapped_column(Integer)
    alt_text: Mapped[str | None] = mapped_column(String(200))
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    product: Mapped[Product] = relationship(back_populates="images", lazy="raise")
    variant: Mapped[ProductVariant | None] = relationship(back_populates="images", lazy="raise")

    __table_args__ = (
        # One primary image per product colour (or per product for shared images).
        Index(
            "uq_product_images_one_primary",
            "product_id",
            "variant_id",
            unique=True,
            postgresql_where=text("is_primary"),
            postgresql_nulls_not_distinct=True,
        ),
    )
