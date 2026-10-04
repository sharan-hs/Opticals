from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from app.models.enums import ColorFamily, FrameMaterial, FrameShape, FrameType, Gender
from app.modules.inventory.availability import Availability


class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    public_id: str
    version: int | None
    width: int | None
    height: int | None
    alt_text: str | None
    is_primary: bool
    variant_id: int | None


class BrandRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    name: str


class CategoryRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    name: str


class ColorSwatch(BaseModel):
    name: str
    hex: str | None
    sku: str


class ProductCard(BaseModel):
    id: int
    slug: str
    name: str
    model_number: str | None
    brand: BrandRef
    category: CategoryRef
    price_paise: int  # cheapest active colour
    mrp_paise: int  # MRP of that colour
    discount_pct: int
    image: ImageOut | None
    colors: list[ColorSwatch]
    availability: Availability


class VariantOut(BaseModel):
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
    discount_pct: int
    availability: Availability
    images: list[ImageOut]


class ProductDetail(ProductCard):
    description: str | None
    specifications: list[dict[str, Any]]
    gender: Gender
    frame_type: FrameType | None
    frame_shape: FrameShape | None
    frame_material: FrameMaterial | None
    variants: list[VariantOut]
    images: list[ImageOut]  # shared by every colour


class FacetValue(BaseModel):
    value: str
    label: str
    count: int


class PriceRange(BaseModel):
    min: int  # rupees
    max: int


class Facets(BaseModel):
    categories: list[FacetValue]
    brands: list[FacetValue]
    colors: list[FacetValue]
    genders: list[FacetValue]
    frame_shapes: list[FacetValue]
    frame_types: list[FacetValue]
    materials: list[FacetValue]
    price: PriceRange | None


class CategoryNode(BaseModel):
    slug: str
    name: str
    description: str | None
    image_public_id: str | None
    children: list["CategoryNode"]


SortOption = Literal[
    "featured", "relevance", "newest", "price_asc", "price_desc", "name_asc", "name_desc"
]
