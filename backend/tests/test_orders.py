"""Checkout and orders: pricing, holding stock, UPI and pay-at-store flows,
expiry, cancellations, refunds, admin actions, settings."""

import re
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import (
    Brand,
    CartItem,
    Category,
    Inventory,
    InventoryTransaction,
    Order,
    OrderStatusHistory,
    Payment,
    Product,
    ProductVariant,
    Refund,
    User,
)
from app.models.enums import InventoryTransactionType, ProductStatus, UserRole
from app.modules.cart import service as cart_service
from app.modules.orders import service as orders
from app.modules.orders.schemas import PlaceOrderRequest
from tests.conftest import Outbox
from tests.factories import (
    auth_headers,
    make_address,
    make_inventory,
    make_product,
    make_user,
    make_variant,
)
from tests.test_inventory import run_parallel

API = "/api/v1"


def stocked(db: Session, on_hand: int = 5, price: int = 700_000, mrp: int = 800_000) -> int:
    variant = make_variant(db, make_product(db), price_paise=price, mrp_paise=mrp)
    make_inventory(db, variant, on_hand=on_hand)
    return variant.id


def levels(db: Session, variant_id: int) -> tuple[int, int]:
    db.expire_all()
    inventory = db.get(Inventory, variant_id)
    assert inventory is not None
    return inventory.on_hand, inventory.reserved


class Shopper:
    """A signed-in customer with an address and a cart."""

    def __init__(self, client: TestClient, db: Session, user: User | None = None) -> None:
        self.client = client
        self.db = db
        self.user = user or make_user(db, phone="+919876543210")
        self.headers = auth_headers(self.user)
        self.address = make_address(db, self.user)

    def add(self, variant_id: int, quantity: int = 1) -> None:
        response = self.client.post(
            f"{API}/cart/items",
            json={"variant_id": variant_id, "quantity": quantity},
            headers=self.headers,
        )
        assert response.status_code == 200, response.text

    def quote(self, method: str = "UPI") -> dict[str, Any]:
        response = self.client.post(
            f"{API}/checkout/quote", json={"payment_method": method}, headers=self.headers
        )
        assert response.status_code == 200, response.text
        body: dict[str, Any] = response.json()
        return body

    def place(self, method: str = "UPI", key: str | None = None, **body: Any) -> Any:
        payload: dict[str, Any] = {"payment_method": method}
        if method == "UPI":
            payload["address_id"] = self.address.id
        else:
            payload["store_id"] = "vijayanagar"
        if "expected_total_paise" not in body:
            payload["expected_total_paise"] = self.quote(method)["total_paise"]
        payload |= body
        return self.client.post(
            f"{API}/orders",
            json=payload,
            headers=self.headers | {"Idempotency-Key": key or str(uuid.uuid4())},
        )

    def order(self, number: str) -> dict[str, Any]:
        response = self.client.get(f"{API}/orders/{number}", headers=self.headers)
        assert response.status_code == 200, response.text
        body: dict[str, Any] = response.json()
        return body


@pytest.fixture
def shopper(client: TestClient, db: Session) -> Shopper:
    return Shopper(client, db)


@pytest.fixture
def admin(db: Session) -> dict[str, str]:
    return auth_headers(make_user(db, role=UserRole.ADMIN))


def act(client: TestClient, admin: dict[str, str], number: str, action: str, **body: Any) -> Any:
    return client.post(f"{API}/admin/orders/{number}/{action}", json=body, headers=admin)


def created(response: Any) -> dict[str, Any]:
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


def error(response: Any, status: int) -> dict[str, Any]:
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()["error"]
    return body


# --- checkout ------------------------------------------------------------------------


def test_quote_prices_the_cart_with_free_delivery(shopper: Shopper, db: Session) -> None:
    shopper.add(stocked(db, price=700_000, mrp=800_000), 2)
    quote = shopper.quote()
    assert quote["subtotal_paise"] == 1_400_000
    assert quote["delivery_fee_paise"] == 0
    assert quote["total_paise"] == 1_400_000
    assert quote["savings_paise"] == 200_000
    options = quote["options"]
    assert options["upi"] == {"enabled": True, "payment_window_minutes": 30}
    assert options["pay_at_store"] == {"enabled": True, "hold_days": 3}
    assert [s["id"] for s in options["stores"]] == ["basaveshwar-nagar", "vijayanagar"]


def test_place_upi_order(shopper: Shopper, db: Session, outbox: Outbox) -> None:
    variant = stocked(db, on_hand=5)
    shopper.add(variant, 2)
    order = created(shopper.place(customer_note="Gift wrap please"))

    assert re.fullmatch(r"VO-\d{6}-\d{4,}", order["order_number"])
    assert order["status"] == "PENDING_PAYMENT" and order["payment_status"] == "UNPAID"
    assert order["fulfilment"] == "DELIVERY"
    assert order["total_paise"] == 1_400_000 and order["item_count"] == 2
    assert order["items"][0]["unit_price_paise"] == 700_000
    assert order["shipping_address"]["pincode"] == "560079"
    assert order["pickup_store"] is None
    assert order["can_cancel"] is True
    upi = order["upi"]
    assert upi["upi_id"] == "vijaiopticians@example" and upi["amount_paise"] == 1_400_000
    assert "pa=vijaiopticians%40example" in upi["upi_uri"] and "am=14000.00" in upi["upi_uri"]
    assert levels(db, variant) == (5, 2)  # held, not sold
    assert shopper.client.get(f"{API}/cart", headers=shopper.headers).json()["lines"] == []
    assert [m.subject for m in outbox.messages] == [
        f"Order {order['order_number']} received",
        f"New order {order['order_number']}",
    ]
    assert "vijaiopticians@example" in outbox.messages[0].text
    assert outbox.messages[1].to == "vachanvijai@gmail.com"


def test_same_key_returns_the_same_order(shopper: Shopper, db: Session) -> None:
    variant = stocked(db)
    shopper.add(variant)
    key = str(uuid.uuid4())
    first = created(shopper.place(key=key))
    again = shopper.place(key=key, expected_total_paise=first["total_paise"])
    assert again.status_code == 200
    assert again.json()["order_number"] == first["order_number"]
    assert levels(db, variant) == (5, 1)


def test_refused_when_the_price_changed(shopper: Shopper, db: Session) -> None:
    variant = stocked(db)
    shopper.add(variant)
    seen = shopper.quote()["total_paise"]
    row = db.get(ProductVariant, variant)
    assert row is not None
    row.price_paise = 750_000
    db.flush()
    err = error(shopper.place(expected_total_paise=seen), 409)
    assert err["code"] == "PRICE_CHANGED" and err["details"] == {"total_paise": 750_000}
    assert levels(db, variant) == (5, 0)


def test_refused_when_the_cart_has_issues(shopper: Shopper, db: Session) -> None:
    variant = stocked(db, on_hand=3)
    shopper.add(variant, 3)
    total = shopper.quote()["total_paise"]
    inventory = db.get(Inventory, variant)
    assert inventory is not None
    inventory.on_hand = 2
    db.flush()
    assert error(shopper.place(expected_total_paise=total), 409)["code"] == "CART_HAS_ISSUES"
    assert error(Shopper(shopper.client, db).place(expected_total_paise=0), 400)["code"] == (
        "CART_EMPTY"
    )


def test_needs_an_address_or_a_store(shopper: Shopper, db: Session) -> None:
    shopper.add(stocked(db))
    assert error(shopper.place(address_id=None), 400)["code"] == "ADDRESS_REQUIRED"
    assert error(shopper.place("PAY_AT_STORE", store_id="moon"), 400)["code"] == "STORE_REQUIRED"
    other = make_address(db, make_user(db))
    assert shopper.place(address_id=other.id).status_code == 404


def test_unpaid_order_limit(shopper: Shopper, db: Session) -> None:
    variant = stocked(db, on_hand=10)
    for _ in range(3):
        shopper.add(variant)
        created(shopper.place())
    shopper.add(variant)
    assert error(shopper.place(), 409)["code"] == "TOO_MANY_UNPAID"


# --- UPI ---------------------------------------------------------------------------------


def test_upi_payment_confirmed_then_shipped(
    shopper: Shopper, db: Session, admin: dict[str, str], outbox: Outbox
) -> None:
    client = shopper.client
    variant = stocked(db, on_hand=5)
    shopper.add(variant, 2)
    number = created(shopper.place())["order_number"]

    reported = client.post(
        f"{API}/orders/{number}/payment",
        json={"reference": "412345678901"},
        headers=shopper.headers,
    )
    assert reported.status_code == 200, reported.text
    order = reported.json()
    assert order["payment_status"] == "VERIFYING"
    assert order["upi"]["reference_submitted"] == "412345678901"
    assert order["can_cancel"] is False

    counts = client.get(f"{API}/admin/orders/counts", headers=admin).json()
    assert counts["to_verify"] == 1
    detail = client.get(f"{API}/admin/orders/{number}", headers=admin).json()
    assert detail["actions"] == ["confirm_payment", "reject_payment", "cancel"]
    assert detail["payments"][0]["reference"] == "412345678901"

    outbox.messages.clear()
    detail = act(client, admin, number, "confirm-payment").json()
    assert detail["status"] == "CONFIRMED" and detail["payment_status"] == "PAID"
    assert detail["payments"][0]["status"] == "CAPTURED"
    assert detail["upi"] is None
    assert levels(db, variant) == (3, 0)  # sold
    sale = db.scalars(
        select(InventoryTransaction).where(InventoryTransaction.variant_id == variant)
    ).all()
    assert [(t.type, t.quantity_delta) for t in sale] == [(InventoryTransactionType.SALE, -2)]
    assert outbox.messages[0].subject == f"Payment received for {number}"

    assert error(act(client, admin, number, "status", status="SHIPPED"), 409)["code"] == (
        "INVALID_STATUS_CHANGE"
    )
    act(client, admin, number, "status", status="PROCESSING")
    assert error(act(client, admin, number, "status", status="SHIPPED"), 409)["code"] == (
        "TRACKING_REQUIRED"
    )
    shipped = act(
        client,
        admin,
        number,
        "status",
        status="SHIPPED",
        courier_name="DTDC",
        tracking_number="D123",
        tracking_url="https://track.example/D123",
    ).json()
    assert shipped["status"] == "SHIPPED" and shipped["tracking_number"] == "D123"
    assert "D123" in outbox.messages[-1].text
    delivered = act(client, admin, number, "status", status="DELIVERED").json()
    assert delivered["status"] == "DELIVERED" and delivered["actions"] == []

    timeline = [t["status"] for t in shopper.order(number)["timeline"]]
    assert timeline == ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]
    by = [h["by"] for h in detail["history"]]
    assert by[0] is None and by[-1] is not None  # placed by the customer, confirmed by staff


def test_payment_not_received(shopper: Shopper, db: Session, admin: dict[str, str]) -> None:
    variant = stocked(db)
    shopper.add(variant)
    number = created(shopper.place())["order_number"]
    shopper.client.post(
        f"{API}/orders/{number}/payment",
        json={"reference": "999999999999"},
        headers=shopper.headers,
    )
    detail = act(shopper.client, admin, number, "reject-payment", note="Nothing in the bank").json()
    assert detail["status"] == "CANCELLED" and detail["payment_status"] == "FAILED"
    assert detail["cancel_reason"] == "Payment not received: Nothing in the bank"
    assert levels(db, variant) == (5, 0)
    assert detail["actions"] == ["confirm_payment"]  # in case it turns up after all


def test_reference_can_only_pay_one_order(
    shopper: Shopper, db: Session, admin: dict[str, str]
) -> None:
    variant = stocked(db)
    numbers = []
    for _ in range(2):
        shopper.add(variant)
        numbers.append(created(shopper.place())["order_number"])
    act(shopper.client, admin, numbers[0], "confirm-payment", reference="412345678901")
    response = act(shopper.client, admin, numbers[1], "confirm-payment", reference="412345678901")
    assert error(response, 409)["code"] == "DUPLICATE_REFERENCE"


def test_unpaid_orders_expire(shopper: Shopper, db: Session) -> None:
    variant = stocked(db)
    shopper.add(variant)
    unpaid = created(shopper.place())["order_number"]
    shopper.add(variant)
    reported = created(shopper.place())["order_number"]
    shopper.client.post(
        f"{API}/orders/{reported}/payment",
        json={"reference": "412345678901"},
        headers=shopper.headers,
    )
    for order in db.scalars(select(Order).where(Order.order_number.in_([unpaid, reported]))):
        order.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db.flush()

    listed = shopper.client.get(f"{API}/orders", headers=shopper.headers).json()["items"]
    statuses = {o["order_number"]: o["status"] for o in listed}
    assert statuses == {unpaid: "CANCELLED", reported: "PENDING_PAYMENT"}
    assert shopper.order(unpaid)["cancel_reason"] == "Not paid in time"
    assert levels(db, variant) == (5, 1)  # only the reported order still holds stock

    late = shopper.client.post(
        f"{API}/orders/{unpaid}/payment",
        json={"reference": "412345678902"},
        headers=shopper.headers,
    )
    assert error(late, 400)["code"] == "ORDER_EXPIRED"


def test_late_payment_accepted_if_stock_remains(
    shopper: Shopper, db: Session, admin: dict[str, str]
) -> None:
    variant = stocked(db, on_hand=1)
    shopper.add(variant)
    number = created(shopper.place())["order_number"]
    order = db.scalar(select(Order).where(Order.order_number == number))
    assert order is not None
    order.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db.flush()
    assert shopper.order(number)["status"] == "CANCELLED"

    # Someone else buys the last one: the late payment can't be honoured.
    other = Shopper(shopper.client, db)
    other.add(variant)
    other_number = created(other.place())["order_number"]
    assert error(act(shopper.client, admin, number, "confirm-payment"), 409)["code"] == (
        "OUT_OF_STOCK"
    )
    act(shopper.client, admin, other_number, "cancel", reason="Customer changed their mind")
    detail = act(shopper.client, admin, number, "confirm-payment", note="Paid late").json()
    assert detail["status"] == "CONFIRMED" and detail["cancel_reason"] is None
    assert levels(db, variant) == (0, 0)


# --- pay at store ----------------------------------------------------------------


def test_pay_at_store(shopper: Shopper, db: Session, admin: dict[str, str], outbox: Outbox) -> None:
    variant = stocked(db)
    shopper.add(variant)
    order = created(shopper.place("PAY_AT_STORE"))
    number = order["order_number"]
    assert order["fulfilment"] == "PICKUP" and order["shipping_address"] is None
    assert order["pickup_store"]["name"] == "Vijayanagar"
    assert order["upi"] is None
    placed = datetime.fromisoformat(order["placed_at"])
    assert datetime.fromisoformat(order["expires_at"]) - placed == timedelta(days=3)
    assert "Collect it from our Vijayanagar store" in outbox.messages[0].text

    detail = act(shopper.client, admin, number, "collected").json()
    assert detail["status"] == "DELIVERED" and detail["payment_status"] == "PAID"
    assert [h["to_status"] for h in detail["history"]] == [
        "PENDING_PAYMENT",
        "CONFIRMED",
        "DELIVERED",
    ]
    assert levels(db, variant) == (4, 0)
    assert error(act(shopper.client, admin, number, "status", status="SHIPPED"), 409)


# --- cancelling and refunds -------------------------------------------------------


def test_customer_cancels_an_unpaid_order(shopper: Shopper, db: Session) -> None:
    variant = stocked(db)
    shopper.add(variant)
    number = created(shopper.place())["order_number"]
    stranger = auth_headers(make_user(db))
    assert shopper.client.get(f"{API}/orders/{number}", headers=stranger).status_code == 404
    assert (
        shopper.client.post(f"{API}/orders/{number}/cancel", json={}, headers=stranger).status_code
        == 404
    )

    response = shopper.client.post(
        f"{API}/orders/{number}/cancel", json={"reason": "Ordered twice"}, headers=shopper.headers
    )
    assert response.json()["status"] == "CANCELLED"
    assert response.json()["cancel_reason"] == "Cancelled by the customer: Ordered twice"
    assert levels(db, variant) == (5, 0)


def test_customer_cannot_cancel_while_payment_is_checked(shopper: Shopper, db: Session) -> None:
    shopper.add(stocked(db))
    number = created(shopper.place())["order_number"]
    shopper.client.post(
        f"{API}/orders/{number}/payment",
        json={"reference": "412345678901"},
        headers=shopper.headers,
    )
    response = shopper.client.post(
        f"{API}/orders/{number}/cancel", json={}, headers=shopper.headers
    )
    assert error(response, 409)["code"] == "PAYMENT_BEING_CHECKED"


def test_cancelling_a_paid_order_restocks_and_refunds(
    shopper: Shopper, db: Session, admin: dict[str, str]
) -> None:
    variant = stocked(db)
    shopper.add(variant, 2)
    number = created(shopper.place())["order_number"]
    act(shopper.client, admin, number, "confirm-payment", reference="412345678901")
    assert levels(db, variant) == (3, 0)

    detail = act(shopper.client, admin, number, "cancel", reason="Frame damaged in store").json()
    assert detail["status"] == "CANCELLED" and detail["payment_status"] == "REFUND_PENDING"
    assert detail["actions"] == ["refunded"]
    assert levels(db, variant) == (5, 0)
    assert (
        shopper.client.get(f"{API}/admin/orders/counts", headers=admin).json()["refunds_pending"]
        == 1
    )

    detail = act(shopper.client, admin, number, "refunded", note="UPI refund 15:20").json()
    assert detail["payment_status"] == "REFUNDED" and detail["actions"] == []
    refund = db.scalar(select(Refund))
    assert refund is not None and refund.amount_paise == 1_400_000


# --- admin list, settings, scheduled job ---------------------------------------


def test_admin_list_filters(shopper: Shopper, db: Session, admin: dict[str, str]) -> None:
    variant = stocked(db)
    shopper.add(variant)
    upi = created(shopper.place())["order_number"]
    shopper.add(variant)
    store = created(shopper.place("PAY_AT_STORE"))["order_number"]

    def numbers(**params: Any) -> list[str]:
        response = shopper.client.get(f"{API}/admin/orders", params=params, headers=admin)
        assert response.status_code == 200, response.text
        return [row["order_number"] for row in response.json()["items"]]

    assert numbers() == [store, upi]
    assert numbers(queue="awaiting_pickup") == [store]
    assert numbers(payment_method="UPI") == [upi]
    assert numbers(q=shopper.user.email) == [store, upi]
    assert numbers(q=upi) == [upi]
    assert numbers(status="SHIPPED") == []
    assert shopper.client.get(f"{API}/admin/orders", headers=shopper.headers).status_code == 403


def test_settings(client: TestClient, db: Session, admin: dict[str, str]) -> None:
    settings = client.get(f"{API}/admin/settings", headers=admin).json()
    assert settings["upi_id"] == "vijaiopticians@example" and settings["delivery_fee_paise"] == 0

    bad = client.patch(f"{API}/admin/settings", json={"upi_id": "not a upi"}, headers=admin)
    assert bad.status_code == 422
    saved = client.patch(
        f"{API}/admin/settings",
        json={"upi_id": "9731307237@ybl", "upi_payee_name": "Vijai Opticians"},
        headers=admin,
    )
    assert saved.json()["upi_id"] == "9731307237@ybl"
    assert client.get(f"{API}/admin/settings", headers=admin).json()["upi_id"] == "9731307237@ybl"

    both_off = client.patch(
        f"{API}/admin/settings",
        json={"upi_enabled": False, "pay_at_store_enabled": False},
        headers=admin,
    )
    assert error(both_off, 400)["code"] == "NO_PAYMENT_METHOD"

    client.patch(f"{API}/admin/settings", json={"upi_enabled": False}, headers=admin)
    shopper = Shopper(client, db)
    shopper.add(stocked(db))
    assert shopper.quote()["options"]["upi"]["enabled"] is False
    assert error(shopper.place(), 400)["code"] == "PAYMENT_METHOD_UNAVAILABLE"
    assert client.get(f"{API}/admin/settings", headers=shopper.headers).status_code == 403


def test_expiry_job_endpoint(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    url = f"{API}/internal/expire-orders"
    assert client.post(url).status_code == 404  # no secret configured: not exposed
    monkeypatch.setattr(get_settings(), "cron_secret", "s3cret")
    assert client.post(url, headers={"Authorization": "Bearer wrong"}).status_code == 401
    shopper = Shopper(client, db)
    shopper.add(stocked(db))
    number = created(shopper.place())["order_number"]
    order = db.scalar(select(Order).where(Order.order_number == number))
    assert order is not None
    order.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.flush()
    response = client.post(url, headers={"Authorization": "Bearer s3cret"})
    assert response.json() == {"expired": 1}


# --- concurrency (real commits on separate connections) ------------------------


@pytest.fixture
def last_unit(engine: Engine) -> Iterator[tuple[int, list[int]]]:
    """One frame in stock and three customers with it in their cart."""
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
            product_id=product.id,
            sku=f"SKU-{tag}",
            color_name="Black",
            mrp_paise=100,
            price_paise=100,
        )
        session.add(variant)
        session.flush()
        session.add(Inventory(variant_id=variant.id, on_hand=1))
        users = [
            User(email=f"{tag}-{n}@example.com", password_hash="x", full_name=f"Buyer {n}")
            for n in range(3)
        ]
        session.add_all(users)
        session.flush()
        for user in users:
            cart_service.add_item(session, user, variant.id, 1)
        ids = (variant.id, [u.id for u in users], product.id, brand.id, category.id)
    yield ids[0], ids[1]
    with Session(engine) as session:
        order_ids = select(Order.id).where(Order.user_id.in_(ids[1]))
        session.execute(delete(Payment).where(Payment.order_id.in_(order_ids)))
        session.execute(
            delete(OrderStatusHistory).where(OrderStatusHistory.order_id.in_(order_ids))
        )
        session.execute(delete(Order).where(Order.user_id.in_(ids[1])))
        session.execute(delete(CartItem).where(CartItem.variant_id == ids[0]))
        session.execute(delete(User).where(User.id.in_(ids[1])))
        session.execute(delete(Inventory).where(Inventory.variant_id == ids[0]))
        session.execute(delete(ProductVariant).where(ProductVariant.id == ids[0]))
        session.execute(delete(Product).where(Product.id == ids[2]))
        session.execute(delete(Brand).where(Brand.id == ids[3]))
        session.execute(delete(Category).where(Category.id == ids[4]))
        session.commit()


def test_last_unit_is_sold_once(engine: Engine, last_unit: tuple[int, list[int]]) -> None:
    variant_id, user_ids = last_unit
    users = iter(user_ids)

    def checkout() -> None:
        user_id = next(users)
        with Session(engine) as session:
            user = session.get(User, user_id)
            assert user is not None
            request = PlaceOrderRequest(
                payment_method="PAY_AT_STORE", store_id="vijayanagar", expected_total_paise=100
            )
            orders.place(session, user, request, uuid.uuid4(), Outbox())

    errors = run_parallel(3, checkout)
    # Losers are refused either when the cart is priced or when stock is held.
    codes = [getattr(e, "code", repr(e)) for e in errors]
    assert len(codes) == 2 and set(codes) <= {"OUT_OF_STOCK", "CART_HAS_ISSUES"}, codes
    with Session(engine) as session:
        inventory = session.get(Inventory, variant_id)
        assert inventory is not None and (inventory.on_hand, inventory.reserved) == (1, 1)
        assert len(session.scalars(select(Order).where(Order.user_id.in_(user_ids))).all()) == 1
