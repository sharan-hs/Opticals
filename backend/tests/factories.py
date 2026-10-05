"""Small builders for test data. Each returns flushed rows (ids assigned)."""

import itertools
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models import (
    Address,
    Brand,
    Category,
    Inventory,
    Order,
    Product,
    ProductVariant,
    User,
)
from app.models.enums import ProductStatus

_seq = itertools.count(1)


def _n() -> int:
    return next(_seq)


def make_user(db: Session, *, password: str | None = None, **overrides: Any) -> User:
    """`password` is hashed for real (slow-ish); without it the hash is a placeholder."""
    n = _n()
    if password is not None:
        overrides["password_hash"] = hash_password(password)
    values: dict[str, Any] = {
        "email": f"user{n}@example.com",
        "password_hash": "not-a-real-hash",
        "full_name": f"Test User {n}",
    } | overrides
    user = User(**values)
    db.add(user)
    db.flush()
    return user


def make_category(db: Session, **overrides: Any) -> Category:
    n = _n()
    values: dict[str, Any] = {"name": f"Category {n}", "slug": f"category-{n}"} | overrides
    category = Category(**values)
    db.add(category)
    db.flush()
    return category


def make_brand(db: Session, **overrides: Any) -> Brand:
    n = _n()
    values: dict[str, Any] = {"name": f"Brand {n}", "slug": f"brand-{n}"} | overrides
    brand = Brand(**values)
    db.add(brand)
    db.flush()
    return brand


def make_product(db: Session, **overrides: Any) -> Product:
    n = _n()
    values: dict[str, Any] = {
        "name": f"Frame {n}",
        "slug": f"frame-{n}",
        "status": ProductStatus.ACTIVE,
    } | overrides
    if "brand_id" not in values:
        values["brand_id"] = make_brand(db).id
    if "category_id" not in values:
        values["category_id"] = make_category(db).id
    product = Product(**values)
    db.add(product)
    db.flush()
    return product


def make_variant(db: Session, product: Product | None = None, **overrides: Any) -> ProductVariant:
    n = _n()
    values: dict[str, Any] = {
        "sku": f"SKU-{n}",
        "color_name": f"Colour {n}",
        "mrp_paise": 1_000_000,
        "price_paise": 900_000,
    } | overrides
    variant = ProductVariant(product_id=(product or make_product(db)).id, **values)
    db.add(variant)
    db.flush()
    return variant


def make_inventory(db: Session, variant: ProductVariant, **overrides: Any) -> Inventory:
    inventory = Inventory(variant_id=variant.id, **overrides)
    db.add(inventory)
    db.flush()
    return inventory


def make_address(db: Session, user: User, **overrides: Any) -> Address:
    values: dict[str, Any] = {
        "full_name": user.full_name,
        "phone": "+919731307237",
        "line1": "1 Test Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560079",
    } | overrides
    address = Address(user_id=user.id, **values)
    db.add(address)
    db.flush()
    return address


def make_order(db: Session, user: User, **overrides: Any) -> Order:
    n = _n()
    values: dict[str, Any] = {
        "order_number": f"VO-TEST-{n:04d}",
        "subtotal_paise": 900_000,
        "total_paise": 900_000,
        "shipping_address": {"city": "Bengaluru", "pincode": "560079"},
        "contact_email": user.email,
        "idempotency_key": uuid.uuid4(),
        "expires_at": None,
        "status": "CONFIRMED",
        "payment_method": "UPI",
        "fulfilment": "DELIVERY",
    } | overrides
    order = Order(user_id=user.id, **values)
    db.add(order)
    db.flush()
    return order


def auth_headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role).token}"}
