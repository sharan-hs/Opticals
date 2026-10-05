"""Cart: live pricing, stock checks, line issues, ownership, merge, guest preview."""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, delete, func, select
from sqlalchemy.orm import Session

from app.models import (
    Brand,
    Cart,
    CartItem,
    Category,
    Inventory,
    Product,
    ProductVariant,
    User,
)
from app.models.enums import ProductStatus
from app.modules.cart import service as cart
from tests.factories import auth_headers, make_inventory, make_product, make_user, make_variant
from tests.test_inventory import run_parallel

API = "/api/v1"


def stocked(db: Session, on_hand: int = 5, reserved: int = 0, **variant: Any) -> ProductVariant:
    v = make_variant(db, make_product(db), **variant)
    make_inventory(db, v, on_hand=on_hand, reserved=reserved)
    return v


@pytest.fixture
def user(db: Session) -> User:
    return make_user(db)


@pytest.fixture
def headers(user: User) -> dict[str, str]:
    return auth_headers(user)


def add(client: TestClient, headers: dict[str, str], variant_id: int, quantity: int = 1) -> Any:
    return client.post(
        f"{API}/cart/items", json={"variant_id": variant_id, "quantity": quantity}, headers=headers
    )


def ok(response: Any) -> dict[str, Any]:
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


def error(response: Any, status: int) -> dict[str, Any]:
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()["error"]
    return body


# --- reading and adding --------------------------------------------------------


def test_cart_needs_sign_in(client: TestClient) -> None:
    assert client.get(f"{API}/cart").status_code == 401
    line = {"variant_id": 1, "quantity": 1}
    assert client.post(f"{API}/cart/items", json=line).status_code == 401
    assert client.post(f"{API}/cart/merge", json={"items": []}).status_code == 401


def test_empty_cart_is_not_stored(client: TestClient, db: Session, headers: dict[str, str]) -> None:
    response = client.get(f"{API}/cart", headers=headers)
    assert ok(response) == {
        "lines": [],
        "item_count": 0,
        "subtotal_paise": 0,
        "savings_paise": 0,
        "has_issues": False,
    }
    assert response.headers["Cache-Control"] == "no-store"
    assert db.scalar(select(func.count()).select_from(Cart)) == 0


def test_add_prices_from_the_database_and_merges(
    client: TestClient, db: Session, headers: dict[str, str]
) -> None:
    variant = stocked(db, on_hand=5, mrp_paise=1_000_000, price_paise=900_000, color_name="Havana")
    body = ok(add(client, headers, variant.id, 2))
    [line] = body["lines"]
    assert line["variant_id"] == variant.id
    assert line["color_name"] == "Havana"
    assert line["unit_price_paise"] == 900_000
    assert line["line_total_paise"] == 1_800_000
    assert line["max_quantity"] == 5 and line["issue"] is None
    assert body["subtotal_paise"] == 1_800_000 and body["savings_paise"] == 200_000

    body = ok(add(client, headers, variant.id, 1))
    assert [(x["variant_id"], x["quantity"]) for x in body["lines"]] == [(variant.id, 3)]
    assert body["item_count"] == 3

    # The price is never stored: a change in the admin shows up at once.
    variant.price_paise = 800_000
    db.flush()
    assert ok(client.get(f"{API}/cart", headers=headers))["subtotal_paise"] == 2_400_000


def test_adding_more_than_stock(client: TestClient, db: Session, headers: dict[str, str]) -> None:
    variant = stocked(db, on_hand=5, reserved=2)  # 3 available
    ok(add(client, headers, variant.id, 2))
    err = error(add(client, headers, variant.id, 2), 409)
    assert err["code"] == "INSUFFICIENT_STOCK"
    assert err["message"] == "Only 3 left in stock. You already have 2 in your cart."
    assert err["details"] == {"variant_id": variant.id, "max_quantity": 3}

    sold_out = stocked(db, on_hand=0)
    assert error(add(client, headers, sold_out.id), 409)["code"] == "OUT_OF_STOCK"


def test_per_item_limit(client: TestClient, db: Session, headers: dict[str, str]) -> None:
    variant = stocked(db, on_hand=50)
    ok(add(client, headers, variant.id, 8))
    assert error(add(client, headers, variant.id, 3), 409)["code"] == "QUANTITY_LIMIT"
    assert add(client, headers, variant.id, 11).status_code == 422
    assert add(client, headers, variant.id, 0).status_code == 422


@pytest.mark.parametrize("hide", ["draft", "inactive_product", "inactive_colour", "deleted_colour"])
def test_cannot_add_what_is_not_sold(
    client: TestClient, db: Session, headers: dict[str, str], hide: str
) -> None:
    variant = stocked(db)
    product = db.get(Product, variant.product_id)
    assert product is not None
    if hide == "draft":
        product.status = ProductStatus.DRAFT
    elif hide == "inactive_product":
        product.status = ProductStatus.INACTIVE
    elif hide == "inactive_colour":
        variant.is_active = False
    else:
        variant.deleted_at = datetime.now(UTC)
    db.flush()
    assert error(add(client, headers, variant.id), 404)["message"] == (
        "This item is no longer available."
    )


def test_unknown_variant(client: TestClient, headers: dict[str, str]) -> None:
    assert add(client, headers, 999_999_999).status_code == 404


def test_cart_line_limit(
    client: TestClient, db: Session, headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cart, "MAX_CART_LINES", 2)
    for _ in range(2):
        ok(add(client, headers, stocked(db).id))
    assert error(add(client, headers, stocked(db).id), 409)["code"] == "CART_FULL"


# --- line issues ----------------------------------------------------------------


def test_line_issues_after_the_catalogue_changes(
    client: TestClient, db: Session, headers: dict[str, str]
) -> None:
    keep = stocked(db, on_hand=5, price_paise=100_000, mrp_paise=100_000)
    hidden = stocked(db, on_hand=5)
    low = stocked(db, on_hand=5)
    gone = stocked(db, on_hand=5)
    for variant, quantity in [(keep, 1), (hidden, 1), (low, 4), (gone, 1)]:
        ok(add(client, headers, variant.id, quantity))

    product = db.get(Product, hidden.product_id)
    assert product is not None
    product.status = ProductStatus.INACTIVE
    for variant_id, on_hand in [(low.id, 2), (gone.id, 0)]:
        inventory = db.get(Inventory, variant_id)
        assert inventory is not None
        inventory.on_hand = on_hand
    db.flush()

    body = ok(client.get(f"{API}/cart", headers=headers))
    issues = {x["variant_id"]: (x["issue"], x["max_quantity"]) for x in body["lines"]}
    assert issues == {
        keep.id: (None, 5),
        hidden.id: ("INACTIVE", 0),
        low.id: ("INSUFFICIENT_STOCK", 2),
        gone.id: ("OUT_OF_STOCK", 0),
    }
    assert body["has_issues"] is True
    assert body["subtotal_paise"] == 100_000  # only the line that can be bought
    assert body["item_count"] == 7


def test_quantity_changes(client: TestClient, db: Session, headers: dict[str, str]) -> None:
    variant = stocked(db, on_hand=4)
    ok(add(client, headers, variant.id, 2))
    url = f"{API}/cart/items/{variant.id}"

    assert ok(client.patch(url, json={"quantity": 4}, headers=headers))["item_count"] == 4
    assert error(client.patch(url, json={"quantity": 5}, headers=headers), 409)["code"] == (
        "INSUFFICIENT_STOCK"
    )

    # Lowering always works, even once the colour stops being sold.
    variant.is_active = False
    db.flush()
    assert error(client.patch(url, json={"quantity": 5}, headers=headers), 404)
    assert ok(client.patch(url, json={"quantity": 1}, headers=headers))["item_count"] == 1

    missing = f"{API}/cart/items/{stocked(db).id}"
    assert error(client.patch(missing, json={"quantity": 1}, headers=headers), 404)["message"] == (
        "This item isn't in your cart."
    )


def test_remove_and_clear(client: TestClient, db: Session, headers: dict[str, str]) -> None:
    a, b = stocked(db), stocked(db)
    ok(add(client, headers, a.id))
    ok(add(client, headers, b.id))
    body = ok(client.delete(f"{API}/cart/items/{a.id}", headers=headers))
    assert [x["variant_id"] for x in body["lines"]] == [b.id]
    ok(client.delete(f"{API}/cart/items/{a.id}", headers=headers))  # already gone: fine

    response = client.delete(f"{API}/cart", headers=headers)
    assert response.status_code == 204
    assert ok(client.get(f"{API}/cart", headers=headers))["lines"] == []


def test_carts_are_private(client: TestClient, db: Session, headers: dict[str, str]) -> None:
    variant = stocked(db)
    ok(add(client, headers, variant.id, 2))
    other = auth_headers(make_user(db))

    assert ok(client.get(f"{API}/cart", headers=other))["lines"] == []
    url = f"{API}/cart/items/{variant.id}"
    assert client.patch(url, json={"quantity": 1}, headers=other).status_code == 404
    ok(client.delete(url, headers=other))
    assert client.delete(f"{API}/cart", headers=other).status_code == 204
    assert ok(client.get(f"{API}/cart", headers=headers))["item_count"] == 2


# --- merge and preview ------------------------------------------------------------


def test_merge_guest_cart(client: TestClient, db: Session, headers: dict[str, str]) -> None:
    in_both = stocked(db, on_hand=10)
    limited = stocked(db, on_hand=3)
    sold_out = stocked(db, on_hand=0)
    hidden = stocked(db)
    hidden.is_active = False
    capped = stocked(db, on_hand=50)
    db.flush()
    ok(add(client, headers, in_both.id, 2))

    guest = [
        {"variant_id": in_both.id, "quantity": 1},
        {"variant_id": limited.id, "quantity": 5},
        {"variant_id": sold_out.id, "quantity": 1},
        {"variant_id": hidden.id, "quantity": 1},
        {"variant_id": 999_999_999, "quantity": 1},
        {"variant_id": capped.id, "quantity": 7},
        {"variant_id": capped.id, "quantity": 7},  # duplicates combine
    ]
    body = ok(client.post(f"{API}/cart/merge", json={"items": guest}, headers=headers))
    quantities = {x["variant_id"]: (x["quantity"], x["issue"]) for x in body["lines"]}
    assert quantities == {
        in_both.id: (3, None),
        limited.id: (3, None),
        sold_out.id: (1, "OUT_OF_STOCK"),  # kept so the shopper sees it
        capped.id: (10, None),
    }
    assert body["adjusted_variant_ids"] == sorted([limited.id, hidden.id, 999_999_999, capped.id])

    # Merging nothing is harmless.
    body = ok(client.post(f"{API}/cart/merge", json={"items": []}, headers=headers))
    assert body["item_count"] == 17 and body["adjusted_variant_ids"] == []


def test_preview_is_public_and_stores_nothing(client: TestClient, db: Session) -> None:
    variant = stocked(db, on_hand=1, price_paise=500_000, mrp_paise=600_000)
    draft = stocked(db)
    retired = stocked(db)
    for v, status in [(draft, ProductStatus.DRAFT), (retired, ProductStatus.INACTIVE)]:
        product = db.get(Product, v.product_id)
        assert product is not None
        product.status = status
    db.flush()

    items = [
        {"variant_id": variant.id, "quantity": 2},
        {"variant_id": draft.id, "quantity": 1},
        {"variant_id": retired.id, "quantity": 1},
        {"variant_id": 999_999_999, "quantity": 1},
    ]
    response = client.post(f"{API}/cart/preview", json={"items": items})
    body = ok(response)
    # Unknown ids and never-published products are left out; the browser drops them.
    assert [(x["variant_id"], x["issue"]) for x in body["lines"]] == [
        (variant.id, "INSUFFICIENT_STOCK"),
        (retired.id, "INACTIVE"),
    ]
    assert body["lines"][0]["unit_price_paise"] == 500_000
    assert body["subtotal_paise"] == 0 and body["has_issues"] is True
    assert response.headers["Cache-Control"] == "no-store"
    assert db.scalar(select(func.count()).select_from(Cart)) == 0


def test_guest_cart_size_is_capped(client: TestClient) -> None:
    items = [{"variant_id": n, "quantity": 1} for n in range(51)]
    assert client.post(f"{API}/cart/preview", json={"items": items}).status_code == 422


# --- concurrency (real commits on separate connections) ---------------------------


@pytest.fixture
def committed(engine: Engine) -> Iterator[tuple[int, int]]:
    """A stocked variant and a user, committed so parallel sessions see them."""
    tag = uuid.uuid4().hex[:8]
    with Session(engine) as session:
        brand = Brand(name=f"Brand {tag}", slug=f"brand-{tag}")
        category = Category(name=f"Cat {tag}", slug=f"cat-{tag}")
        session.add_all([brand, category])
        session.flush()
        product = Product(
            name="P",
            slug=f"p-{tag}",
            brand_id=brand.id,
            category_id=category.id,
            status=ProductStatus.ACTIVE,
        )
        session.add(product)
        session.flush()
        variant = ProductVariant(
            product_id=product.id, sku=f"SKU-{tag}", color_name="Black", mrp_paise=1, price_paise=1
        )
        user = User(email=f"{tag}@example.com", password_hash="x", full_name="Parallel")
        session.add_all([variant, user])
        session.flush()
        session.add(Inventory(variant_id=variant.id, on_hand=50))
        session.commit()
        ids = (variant.id, user.id, product.id, brand.id, category.id)
    yield ids[0], ids[1]
    with Session(engine) as session:
        session.execute(delete(User).where(User.id == ids[1]))  # cascades to the cart
        session.execute(delete(Inventory).where(Inventory.variant_id == ids[0]))
        session.execute(delete(ProductVariant).where(ProductVariant.id == ids[0]))
        session.execute(delete(Product).where(Product.id == ids[2]))
        session.execute(delete(Brand).where(Brand.id == ids[3]))
        session.execute(delete(Category).where(Category.id == ids[4]))
        session.commit()


def test_parallel_adds_from_two_tabs(engine: Engine, committed: tuple[int, int]) -> None:
    variant_id, user_id = committed

    def add_one() -> None:
        with Session(engine) as session:
            user = session.get(User, user_id)
            assert user is not None
            cart.add_item(session, user, variant_id, 1)

    # The first adds race to create the cart; none may be lost or fail.
    assert run_parallel(8, add_one) == []
    with Session(engine) as session:
        quantities = session.scalars(
            select(CartItem.quantity).join(Cart).where(Cart.user_id == user_id)
        ).all()
        assert quantities == [8]
