from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from app.core.deps import DbSession
from app.core.pagination import Page, PageParams
from app.models.enums import ColorFamily, FrameMaterial, FrameShape, FrameType, Gender
from app.modules.catalog import service
from app.modules.catalog.queries import Filters
from app.modules.catalog.schemas import (
    BrandRef,
    CategoryNode,
    Facets,
    ProductCard,
    ProductDetail,
    SortOption,
)

router = APIRouter(tags=["catalogue"])

# Browsers always re-check (an admin sees their own edit at once); the CDN
# (Vercel honours CDN-Cache-Control, RFC 9213) serves a copy at most a minute old.
BROWSER_CACHE = "public, max-age=0, must-revalidate"
PUBLIC_CDN_CACHE = "public, max-age=60, stale-while-revalidate=300"
STATIC_CDN_CACHE = "public, max-age=300, stale-while-revalidate=600"


def _cache(response: Response, cdn_policy: str = PUBLIC_CDN_CACHE) -> None:
    response.headers["Cache-Control"] = BROWSER_CACHE
    response.headers["CDN-Cache-Control"] = cdn_policy
MAX_STOREFRONT_PAGE = 48


def catalogue_filters(
    q: Annotated[str | None, Query(max_length=100)] = None,
    category: Annotated[str | None, Query(max_length=100)] = None,
    brand: Annotated[list[str] | None, Query()] = None,
    color: Annotated[list[ColorFamily] | None, Query()] = None,
    gender: Annotated[list[Gender] | None, Query()] = None,
    frame_shape: Annotated[list[FrameShape] | None, Query()] = None,
    frame_type: Annotated[list[FrameType] | None, Query()] = None,
    material: Annotated[list[FrameMaterial] | None, Query()] = None,
    min_price: Annotated[int | None, Query(ge=0, description="Rupees")] = None,
    max_price: Annotated[int | None, Query(ge=0, description="Rupees")] = None,
    in_stock: bool = False,
) -> Filters:
    return Filters(
        q=q.strip() if q and q.strip() else None,
        category=category,
        brands=brand or [],
        colors=color or [],
        genders=gender or [],
        frame_shapes=frame_shape or [],
        frame_types=frame_type or [],
        materials=material or [],
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
    )


CatalogueFilters = Annotated[Filters, Depends(catalogue_filters)]


@router.get("/products")
def list_products(
    db: DbSession,
    response: Response,
    filters: CatalogueFilters,
    sort: SortOption = "featured",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_STOREFRONT_PAGE)] = 12,
) -> Page[ProductCard]:
    _cache(response)
    return service.list_products(db, filters, sort, PageParams(page=page, page_size=page_size))


@router.get("/products/facets")
def product_facets(db: DbSession, response: Response, filters: CatalogueFilters) -> Facets:
    """Filter options with how many products each would show."""
    _cache(response)
    return service.facets(db, filters)


@router.get("/products/{slug}")
def get_product(slug: str, db: DbSession, response: Response) -> ProductDetail:
    _cache(response)
    return service.get_product(db, slug)


@router.get("/products/{slug}/related")
def related_products(
    slug: str,
    db: DbSession,
    response: Response,
    limit: Annotated[int, Query(ge=1, le=12)] = 8,
) -> list[ProductCard]:
    _cache(response)
    return service.related_products(db, slug, limit)


@router.get("/categories")
def categories(db: DbSession, response: Response) -> list[CategoryNode]:
    _cache(response, STATIC_CDN_CACHE)
    return service.category_tree(db)


@router.get("/brands")
def brands(db: DbSession, response: Response) -> list[BrandRef]:
    _cache(response, STATIC_CDN_CACHE)
    return service.brands(db)
