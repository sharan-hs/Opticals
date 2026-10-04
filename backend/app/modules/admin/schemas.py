from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import (
    ColorFamily,
    FrameMaterial,
    FrameShape,
    FrameType,
    Gender,
    InventoryTransactionType,
    ProductStatus,
)
from app.modules.catalog.schemas import ImageOut
from app.modules.inventory.availability import Availability

Slug = Annotated[str, Field(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")]
Name = Annotated[str, Field(min_length=1, max_length=200)]
Paise = Annotated[int, Field(gt=0, le=10_000_000_00)]  # up to ₹1 crore
Sku = Annotated[str, Field(min_length=1, max_length=40, pattern=r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")]
HexColour = Annotated[str, Field(pattern=r"^#[0-9A-Fa-f]{6}$")]
Millimetres = Annotated[int, Field(gt=0, le=300)]


class Spec(BaseModel):
    label: Annotated[str, Field(min_length=1, max_length=60)]
    value: Annotated[str, Field(min_length=1, max_length=200)]


# --- variants ---------------------------------------------------------------


class VariantFields(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    color_name: Annotated[str, Field(min_length=1, max_length=40)] | None = None
    color_family: ColorFamily | None = None
    color_hex: HexColour | None = None
    size_label: Annotated[str, Field(max_length=20)] | None = None
    lens_width_mm: Millimetres | None = None
    bridge_mm: Millimetres | None = None
    temple_mm: Millimetres | None = None
    mrp_paise: Paise | None = None
    price_paise: Paise | None = None
    weight_grams: Annotated[int, Field(gt=0, le=5000)] | None = None
    is_active: bool | None = None
    sort_order: Annotated[int, Field(ge=0, le=999)] | None = None

    @model_validator(mode="after")
    def _price_within_mrp(self) -> Self:
        if self.mrp_paise and self.price_paise and self.price_paise > self.mrp_paise:
            raise ValueError("Selling price can't be more than the MRP")
        return self


class VariantCreate(VariantFields):
    sku: Sku
    color_name: Annotated[str, Field(min_length=1, max_length=40)]
    mrp_paise: Paise
    price_paise: Paise
    is_active: bool = True
    initial_stock: Annotated[int, Field(ge=0, le=100_000)] = 0


class VariantUpdate(VariantFields):
    sku: Sku | None = None


class AdminVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    color_name: str
    color_family: ColorFamily | None
    color_hex: str | None
    size_label: str | None
    lens_width_mm: int | None
    bridge_mm: int | None
    temple_mm: int | None
    mrp_paise: int
    price_paise: int
    weight_grams: int | None
    is_active: bool
    sort_order: int
    on_hand: int
    reserved: int
    available: int
    low_stock_threshold: int
    availability: Availability


# --- products ---------------------------------------------------------------


class ProductFields(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: Name | None = None
    slug: Slug | None = None
    brand_id: int | None = None
    category_id: int | None = None
    gender: Gender | None = None
    frame_type: FrameType | None = None
    frame_shape: FrameShape | None = None
    frame_material: FrameMaterial | None = None
    model_number: Annotated[str, Field(max_length=50)] | None = None
    description: Annotated[str, Field(max_length=5000)] | None = None
    specifications: Annotated[list[Spec], Field(max_length=40)] | None = None
    hsn_code: Annotated[str, Field(pattern=r"^[0-9]{4,8}$")] | None = None
    status: ProductStatus | None = None
    is_featured: bool | None = None

    @field_validator("description")
    @classmethod
    def _no_html(cls, value: str | None) -> str | None:
        # Shown as plain text; reject markup rather than store it.
        if value and "<" in value and ">" in value:
            raise ValueError("Use plain text (no HTML)")
        return value


class ProductCreate(ProductFields):
    name: Name
    brand_id: int
    category_id: int
    gender: Gender = Gender.UNISEX
    status: ProductStatus = ProductStatus.DRAFT
    is_featured: bool = False
    variants: Annotated[list[VariantCreate], Field(min_length=1, max_length=50)]


class ProductUpdate(ProductFields):
    pass


class StatusUpdate(BaseModel):
    status: ProductStatus


class AdminImageOut(ImageOut):
    format: str | None
    bytes: int | None
    sort_order: int


class AdminProductOut(BaseModel):
    id: int
    name: str
    slug: str
    brand_id: int
    category_id: int
    gender: Gender
    frame_type: FrameType | None
    frame_shape: FrameShape | None
    frame_material: FrameMaterial | None
    model_number: str | None
    description: str | None
    specifications: list[Spec]
    hsn_code: str | None
    status: ProductStatus
    is_featured: bool
    created_at: datetime
    updated_at: datetime
    variants: list[AdminVariantOut]
    images: list[AdminImageOut]


class AdminProductRow(BaseModel):
    id: int
    name: str
    slug: str
    model_number: str | None
    brand: str
    category: str
    status: ProductStatus
    is_featured: bool
    variant_count: int
    min_price_paise: int | None
    max_price_paise: int | None
    total_available: int
    stock_status: Availability
    image: ImageOut | None
    updated_at: datetime


StockFilter = Literal["in_stock", "low", "out"]


# --- images -----------------------------------------------------------------


class UploadSignatureRequest(BaseModel):
    product_id: int


class ImageCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    public_id: Annotated[str, Field(min_length=1, max_length=255, pattern=r"^[A-Za-z0-9_\-/.]+$")]
    variant_id: int | None = None
    alt_text: Annotated[str, Field(max_length=200)] | None = None
    is_primary: bool = False
    # Used only when Cloudinary can't be asked (no API key in development).
    version: int | None = None
    width: int | None = None
    height: int | None = None
    format: Annotated[str, Field(max_length=10)] | None = None


class ImageUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    alt_text: Annotated[str, Field(max_length=200)] | None = None
    variant_id: int | None = None
    is_primary: bool | None = None


class ImageOrder(BaseModel):
    image_ids: Annotated[list[int], Field(min_length=1, max_length=200)]


# --- categories & brands ----------------------------------------------------


class CategoryFields(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: Annotated[str, Field(min_length=1, max_length=80)] | None = None
    slug: Slug | None = None
    parent_id: int | None = None
    description: Annotated[str, Field(max_length=1000)] | None = None
    image_public_id: Annotated[str, Field(max_length=255)] | None = None
    sort_order: Annotated[int, Field(ge=0, le=999)] | None = None
    is_active: bool | None = None


class CategoryCreate(CategoryFields):
    name: Annotated[str, Field(min_length=1, max_length=80)]
    is_active: bool = True


class AdminCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    parent_id: int | None
    description: str | None
    image_public_id: str | None
    sort_order: int
    is_active: bool
    product_count: int = 0


class BrandFields(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: Annotated[str, Field(min_length=1, max_length=80)] | None = None
    slug: Slug | None = None
    logo_public_id: Annotated[str, Field(max_length=255)] | None = None
    is_active: bool | None = None


class BrandCreate(BrandFields):
    name: Annotated[str, Field(min_length=1, max_length=80)]
    is_active: bool = True


class AdminBrandOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    logo_public_id: str | None
    is_active: bool
    product_count: int = 0


# --- inventory --------------------------------------------------------------


class InventoryRow(BaseModel):
    variant_id: int
    sku: str
    color_name: str
    size_label: str | None
    product_id: int
    product_name: str
    product_slug: str
    product_status: ProductStatus
    variant_active: bool
    image: ImageOut | None
    on_hand: int
    reserved: int
    available: int
    low_stock_threshold: int
    availability: Availability
    updated_at: datetime


AdjustmentType = Literal["RESTOCK", "ADJUSTMENT", "DAMAGE", "CORRECTION"]


class AdjustmentRequest(BaseModel):
    type: AdjustmentType
    quantity_delta: Annotated[int, Field(ge=-100_000, le=100_000)]
    note: Annotated[str, Field(max_length=500)] | None = None


class MarkOutOfStockRequest(BaseModel):
    note: Annotated[str, Field(min_length=1, max_length=500)]


class ThresholdUpdate(BaseModel):
    low_stock_threshold: Annotated[int, Field(ge=0, le=10_000)]


class TransactionRow(BaseModel):
    id: int
    created_at: datetime
    type: InventoryTransactionType
    quantity_delta: int
    on_hand_after: int
    note: str | None
    order_id: int | None
    variant_id: int
    sku: str
    product_name: str
    color_name: str
    created_by: str | None
