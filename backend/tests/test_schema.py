"""The database itself rejects invalid data, whatever the application code does."""

import uuid
import warnings
from collections.abc import Callable
from datetime import UTC, datetime

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Base, Cart, CartItem, InventoryTransaction, Product, ProductImage
from app.models.enums import InventoryTransactionType
from tests.factories import (
    make_address,
    make_category,
    make_inventory,
    make_order,
    make_product,
    make_user,
    make_variant,
)


def violates(db: Session, constraint: str, action: Callable[[], object]) -> None:
    """Run `action` in a savepoint and assert it fails on the named constraint."""
    with pytest.raises(IntegrityError) as excinfo, db.begin_nested():
        action()
        db.flush()
    assert excinfo.value.orig is not None
    assert excinfo.value.orig.diag.constraint_name == constraint  # type: ignore[attr-defined]


def test_models_match_migrations(db: Session) -> None:
    """Every model change has a migration (CI also applies and reverses them all)."""
    context = MigrationContext.configure(
        db.connection(), opts={"compare_type": True, "compare_server_default": True}
    )
    with warnings.catch_warnings():
        # Alembic can't compare generated columns (products.search_vector).
        warnings.filterwarnings("ignore", "Computed default", UserWarning)
        diff = compare_metadata(context, Base.metadata)
    assert diff == []


# --- identity ---------------------------------------------------------------


def test_email_is_unique_ignoring_case(db: Session) -> None:
    make_user(db, email="Owner@Example.com")
    violates(db, "uq_users_email", lambda: make_user(db, email="owner@example.COM"))


def test_role_limited_to_known_values(db: Session) -> None:
    user = make_user(db)
    violates(
        db,
        "ck_users_role",
        lambda: db.execute(text("UPDATE users SET role = 'ROOT' WHERE id = :id"), {"id": user.id}),
    )


def test_phone_must_be_e164(db: Session) -> None:
    violates(db, "ck_users_phone_e164", lambda: make_user(db, phone="97313 07237"))


def test_one_default_address_per_user(db: Session) -> None:
    user = make_user(db)
    make_address(db, user, is_default=True)
    make_address(db, user, is_default=False)
    violates(
        db, "uq_addresses_one_default_per_user", lambda: make_address(db, user, is_default=True)
    )


def test_deleted_default_address_does_not_block_a_new_default(db: Session) -> None:
    user = make_user(db)
    make_address(db, user, is_default=True, deleted_at=datetime.now(UTC))
    make_address(db, user, is_default=True)


def test_pincode_format(db: Session) -> None:
    user = make_user(db)
    violates(db, "ck_addresses_pincode_format", lambda: make_address(db, user, pincode="056007"))


# --- catalogue --------------------------------------------------------------


def test_product_slug_unique(db: Session) -> None:
    make_product(db, slug="ray-ban-wayfarer")
    violates(db, "uq_products_slug", lambda: make_product(db, slug="ray-ban-wayfarer"))


def test_slug_format(db: Session) -> None:
    violates(db, "ck_products_slug_format", lambda: make_product(db, slug="Ray Ban!"))


def test_top_level_category_names_unique(db: Session) -> None:
    make_category(db, name="Sunglasses", slug="sunglasses")
    violates(
        db,
        "uq_categories_parent_id_name",
        lambda: make_category(db, name="Sunglasses", slug="sunglasses-2"),
    )


def test_sku_unique_ignoring_case(db: Session) -> None:
    make_variant(db, sku="RB4349-710")
    violates(db, "uq_product_variants_upper_sku", lambda: make_variant(db, sku="rb4349-710"))


def test_price_cannot_exceed_mrp(db: Session) -> None:
    violates(
        db,
        "ck_product_variants_price_within_mrp",
        lambda: make_variant(db, mrp_paise=500_000, price_paise=500_001),
    )


def test_one_colour_per_product(db: Session) -> None:
    product = make_product(db)
    make_variant(db, product, color_name="Havana")
    violates(
        db,
        "uq_product_variants_product_id_color_name_size_label",
        lambda: make_variant(db, product, color_name="Havana"),
    )


def test_one_primary_image_per_colour(db: Session) -> None:
    variant = make_variant(db)

    def add_image(n: int) -> None:
        db.add(
            ProductImage(
                product_id=variant.product_id,
                variant_id=variant.id,
                public_id=f"Products/test/test_{n}",
                is_primary=True,
            )
        )

    add_image(1)
    db.flush()
    violates(db, "uq_product_images_one_primary", lambda: add_image(2))


def test_search_vector_is_computed(db: Session) -> None:
    make_product(db, name="Wayfarer Puffer", slug="wayfarer-puffer", model_number="RB4940")
    query = select(Product.slug).where(
        Product.search_vector.op("@@")(func.websearch_to_tsquery("english", "wayfarers"))
    )
    assert db.scalars(query).all() == ["wayfarer-puffer"]
    by_model = select(Product.slug).where(
        Product.search_vector.op("@@")(func.to_tsquery("simple", "rb4940"))
    )
    assert db.scalars(by_model).all() == ["wayfarer-puffer"]


# --- inventory --------------------------------------------------------------


def test_reserved_cannot_exceed_on_hand(db: Session) -> None:
    variant = make_variant(db)
    violates(
        db,
        "ck_inventory_reserved_within_on_hand",
        lambda: make_inventory(db, variant, on_hand=2, reserved=3),
    )


def test_on_hand_cannot_go_negative(db: Session) -> None:
    variant = make_variant(db)
    make_inventory(db, variant, on_hand=1)
    violates(
        db,
        "ck_inventory_on_hand_not_negative",
        lambda: db.execute(
            text("UPDATE inventory SET on_hand = on_hand - 2 WHERE variant_id = :id"),
            {"id": variant.id},
        ),
    )


def test_manual_adjustment_needs_a_note(db: Session) -> None:
    variant = make_variant(db)
    violates(
        db,
        "ck_inventory_transactions_note_required_for_manual",
        lambda: db.add(
            InventoryTransaction(
                variant_id=variant.id,
                type=InventoryTransactionType.ADJUSTMENT,
                quantity_delta=-1,
                on_hand_after=0,
            )
        ),
    )


def test_ledger_delta_not_zero(db: Session) -> None:
    variant = make_variant(db)
    violates(
        db,
        "ck_inventory_transactions_delta_not_zero",
        lambda: db.add(
            InventoryTransaction(
                variant_id=variant.id,
                type=InventoryTransactionType.RESTOCK,
                quantity_delta=0,
                on_hand_after=0,
            )
        ),
    )


# --- cart & orders ----------------------------------------------------------


def test_cart_quantity_range(db: Session) -> None:
    user = make_user(db)
    cart = Cart(user_id=user.id)
    db.add(cart)
    db.flush()
    variant = make_variant(db)
    violates(
        db,
        "ck_cart_items_quantity_range",
        lambda: db.add(CartItem(cart_id=cart.id, variant_id=variant.id, quantity=11)),
    )


def test_order_total_must_add_up(db: Session) -> None:
    user = make_user(db)
    violates(
        db,
        "ck_orders_total_adds_up",
        lambda: make_order(db, user, subtotal_paise=1000, shipping_paise=100, total_paise=1000),
    )


def test_same_idempotency_key_cannot_create_two_orders(db: Session) -> None:
    user = make_user(db)
    key = uuid.uuid4()
    make_order(db, user, idempotency_key=key)
    violates(
        db,
        "uq_orders_user_id_idempotency_key",
        lambda: make_order(db, user, idempotency_key=key),
    )


def test_pending_order_needs_expiry(db: Session) -> None:
    user = make_user(db)
    violates(
        db,
        "ck_orders_pending_has_expiry",
        lambda: make_order(db, user, status="PENDING_PAYMENT", expires_at=None),
    )
