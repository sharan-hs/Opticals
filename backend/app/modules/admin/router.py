"""/api/v1/admin — every route requires an ADMIN account (checked here, once)."""

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status

from app.core.deps import AdminUser, DbSession, require_role
from app.core.pagination import Page, PageParams, page_params
from app.models.enums import InventoryTransactionType, ProductStatus, UserRole
from app.modules.admin import catalog_service as catalog
from app.modules.admin import inventory_service as stock
from app.modules.admin.schemas import (
    AdjustmentRequest,
    AdminBrandOut,
    AdminCategoryOut,
    AdminProductOut,
    AdminProductRow,
    BrandCreate,
    BrandFields,
    CategoryCreate,
    CategoryFields,
    ImageCreate,
    ImageOrder,
    ImageUpdate,
    InventoryRow,
    MarkOutOfStockRequest,
    ProductCreate,
    ProductUpdate,
    StatusUpdate,
    StockFilter,
    ThresholdUpdate,
    TransactionRow,
    UploadSignatureRequest,
    VariantCreate,
    VariantUpdate,
)

router = APIRouter(
    prefix="/admin", tags=["admin"], dependencies=[Depends(require_role(UserRole.ADMIN))]
)

Paging = Annotated[PageParams, Depends(page_params)]
Search = Annotated[str | None, Query(max_length=100)]


# --- products ---------------------------------------------------------------


@router.get("/products")
def list_products(
    db: DbSession,
    paging: Paging,
    q: Search = None,
    category_id: int | None = None,
    brand_id: int | None = None,
    status: ProductStatus | None = None,
    stock_status: StockFilter | None = None,
    sort: str = "-updated",
) -> Page[AdminProductRow]:
    return catalog.list_products(
        db,
        paging,
        q=q,
        category_id=category_id,
        brand_id=brand_id,
        status=status,
        stock=stock_status,
        sort=sort,
    )


@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(body: ProductCreate, db: DbSession, admin: AdminUser) -> AdminProductOut:
    return catalog.create_product(db, admin, body)


@router.get("/products/{product_id}")
def get_product(product_id: int, db: DbSession) -> AdminProductOut:
    return catalog.get_product(db, product_id)


@router.patch("/products/{product_id}")
def update_product(
    product_id: int, body: ProductUpdate, db: DbSession, admin: AdminUser
) -> AdminProductOut:
    return catalog.update_product(db, admin, product_id, body)


@router.patch("/products/{product_id}/status")
def set_product_status(
    product_id: int, body: StatusUpdate, db: DbSession, admin: AdminUser
) -> AdminProductOut:
    return catalog.set_status(db, admin, product_id, body.status)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: DbSession, admin: AdminUser) -> None:
    catalog.delete_product(db, admin, product_id)


# --- variants ---------------------------------------------------------------


@router.post("/products/{product_id}/variants", status_code=status.HTTP_201_CREATED)
def create_variant(
    product_id: int, body: VariantCreate, db: DbSession, admin: AdminUser
) -> AdminProductOut:
    return catalog.create_variant(db, admin, product_id, body)


@router.patch("/variants/{variant_id}")
def update_variant(
    variant_id: int, body: VariantUpdate, db: DbSession, admin: AdminUser
) -> AdminProductOut:
    return catalog.update_variant(db, admin, variant_id, body)


@router.delete("/variants/{variant_id}")
def delete_variant(variant_id: int, db: DbSession, admin: AdminUser) -> AdminProductOut:
    return catalog.delete_variant(db, admin, variant_id)


# --- images -----------------------------------------------------------------


@router.post("/uploads/signature")
def upload_signature(body: UploadSignatureRequest, db: DbSession) -> dict[str, Any]:
    """Signed parameters for uploading straight from the browser to Cloudinary."""
    return catalog.upload_signature(db, body.product_id)


@router.post("/products/{product_id}/images", status_code=status.HTTP_201_CREATED)
def add_image(
    product_id: int, body: ImageCreate, db: DbSession, admin: AdminUser
) -> AdminProductOut:
    return catalog.add_image(db, admin, product_id, body)


@router.put("/products/{product_id}/images/order")
def reorder_images(
    product_id: int, body: ImageOrder, db: DbSession, admin: AdminUser
) -> AdminProductOut:
    return catalog.reorder_images(db, admin, product_id, body.image_ids)


@router.patch("/images/{image_id}")
def update_image(
    image_id: int, body: ImageUpdate, db: DbSession, admin: AdminUser
) -> AdminProductOut:
    return catalog.update_image(db, admin, image_id, body)


@router.delete("/images/{image_id}")
def delete_image(image_id: int, db: DbSession, admin: AdminUser) -> AdminProductOut:
    return catalog.delete_image(db, admin, image_id)


# --- categories & brands ----------------------------------------------------


@router.get("/categories")
def list_categories(db: DbSession) -> list[AdminCategoryOut]:
    return catalog.list_categories(db)


@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_category(body: CategoryCreate, db: DbSession, admin: AdminUser) -> AdminCategoryOut:
    return catalog.create_category(db, admin, body)


@router.patch("/categories/{category_id}")
def update_category(
    category_id: int, body: CategoryFields, db: DbSession, admin: AdminUser
) -> AdminCategoryOut:
    return catalog.update_category(db, admin, category_id, body)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: DbSession, admin: AdminUser) -> None:
    catalog.delete_category(db, admin, category_id)


@router.get("/brands")
def list_brands(db: DbSession) -> list[AdminBrandOut]:
    return catalog.list_brands(db)


@router.post("/brands", status_code=status.HTTP_201_CREATED)
def create_brand(body: BrandCreate, db: DbSession, admin: AdminUser) -> AdminBrandOut:
    return catalog.create_brand(db, admin, body)


@router.patch("/brands/{brand_id}")
def update_brand(
    brand_id: int, body: BrandFields, db: DbSession, admin: AdminUser
) -> AdminBrandOut:
    return catalog.update_brand(db, admin, brand_id, body)


@router.delete("/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(brand_id: int, db: DbSession, admin: AdminUser) -> None:
    catalog.delete_brand(db, admin, brand_id)


# --- inventory --------------------------------------------------------------


@router.get("/inventory")
def list_inventory(
    db: DbSession,
    paging: Paging,
    q: Search = None,
    category_id: int | None = None,
    brand_id: int | None = None,
    stock_status: StockFilter | None = None,
    sort: str = "name",
) -> Page[InventoryRow]:
    return stock.list_inventory(
        db, paging, q=q, category_id=category_id, brand_id=brand_id, stock=stock_status, sort=sort
    )


@router.get("/inventory/low-stock")
def low_stock(db: DbSession, limit: Annotated[int, Query(ge=1, le=200)] = 50) -> list[InventoryRow]:
    return stock.low_stock(db, limit)


@router.get("/inventory/transactions")
def list_transactions(
    db: DbSession,
    paging: Paging,
    variant_id: int | None = None,
    q: Search = None,
    type: InventoryTransactionType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> Page[TransactionRow]:
    return stock.list_transactions(
        db, paging, variant_id=variant_id, q=q, type_=type, date_from=date_from, date_to=date_to
    )


@router.post("/inventory/{variant_id}/adjustments")
def adjust_stock(
    variant_id: int, body: AdjustmentRequest, db: DbSession, admin: AdminUser
) -> InventoryRow:
    return stock.adjust(db, admin, variant_id, body)


@router.post("/inventory/{variant_id}/mark-out-of-stock")
def mark_out_of_stock(
    variant_id: int, body: MarkOutOfStockRequest, db: DbSession, admin: AdminUser
) -> InventoryRow:
    return stock.mark_out_of_stock(db, admin, variant_id, body.note)


@router.patch("/inventory/{variant_id}")
def set_threshold(
    variant_id: int, body: ThresholdUpdate, db: DbSession, admin: AdminUser
) -> InventoryRow:
    return stock.set_threshold(db, admin, variant_id, body.low_stock_threshold)
