"""Stock: ledger correctness, guards, reservations, concurrency, admin endpoints."""

import threading
import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, delete, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import (
    Brand,
    Category,
    Inventory,
    InventoryTransaction,
    Product,
    ProductVariant,
)
from app.models.enums import InventoryTransactionType as T
from app.models.enums import UserRole
from app.modules.inventory import service as inventory
from app.modules.inventory.service import StockLine
from tests.factories import auth_headers, make_inventory, make_order, make_user, make_variant

API = "/api/v1"


def levels(db: Session, variant_id: int) -> tuple[int, int]:
    row = db.get(Inventory, variant_id)
    assert row is not None
    db.refresh(row)
    return row.on_hand, row.reserved


def ledger(db: Session, variant_id: int) -> list[tuple[str, int, int]]:
    rows = db.scalars(
        select(InventoryTransaction)
        .where(InventoryTransaction.variant_id == variant_id)
        .order_by(InventoryTransaction.id)
    ).all()
    return [(str(t.type), t.quantity_delta, t.on_hand_after) for t in rows]


@pytest.fixture
def variant_id(db: Session) -> int:
    variant = make_variant(db)
    make_inventory(db, variant)
    return variant.id


def test_ledger_example_20_18_28(db: Session, variant_id: int) -> None:
    """RESTOCK +20 -> 20; SALE -2 (on payment) -> 18; RESTOCK +10 -> 28."""
    inventory.adjust(db, variant_id, T.RESTOCK, 20, note=None, actor_id=None)
    order = make_order(db, make_user(db))
    inventory.reserve(db, [StockLine(variant_id, 2)])
    assert levels(db, variant_id) == (20, 2)
    inventory.commit_sale(db, [StockLine(variant_id, 2)], order_id=order.id)
    inventory.adjust(db, variant_id, T.RESTOCK, 10, note=None, actor_id=None)

    assert levels(db, variant_id) == (28, 0)
    assert ledger(db, variant_id) == [("RESTOCK", 20, 20), ("SALE", -2, 18), ("RESTOCK", 10, 28)]


@pytest.mark.parametrize(
    ("type_", "delta", "note", "code"),
    [
        (T.RESTOCK, -1, None, "BUSINESS_RULE"),
        (T.DAMAGE, 1, "broken", "BUSINESS_RULE"),
        (T.ADJUSTMENT, -1, None, "NOTE_REQUIRED"),
        (T.ADJUSTMENT, -1, "   ", "NOTE_REQUIRED"),
        (T.RESTOCK, 0, None, "ZERO_QUANTITY"),
        (T.SALE, -1, "x", "INVALID_TYPE"),
    ],
)
def test_adjustment_rules(
    db: Session, variant_id: int, type_: T, delta: int, note: str | None, code: str
) -> None:
    with pytest.raises(AppError) as excinfo:
        inventory.adjust(db, variant_id, type_, delta, note=note, actor_id=None)
    assert excinfo.value.code == code
    assert ledger(db, variant_id) == []


def test_cannot_remove_stock_held_by_orders(db: Session, variant_id: int) -> None:
    inventory.adjust(db, variant_id, T.RESTOCK, 3, note=None, actor_id=None)
    inventory.reserve(db, [StockLine(variant_id, 2)])
    with pytest.raises(AppError) as excinfo:
        inventory.adjust(db, variant_id, T.DAMAGE, -2, note="cracked lens", actor_id=None)
    assert excinfo.value.code == "STOCK_BELOW_RESERVED"
    inventory.adjust(db, variant_id, T.DAMAGE, -1, note="cracked lens", actor_id=None)
    assert levels(db, variant_id) == (2, 2)


def test_mark_out_of_stock_keeps_reservations(db: Session, variant_id: int) -> None:
    inventory.adjust(db, variant_id, T.RESTOCK, 5, note=None, actor_id=None)
    inventory.reserve(db, [StockLine(variant_id, 1)])
    user = make_user(db)
    inventory.mark_out_of_stock(db, variant_id, note="Display pieces only", actor_id=user.id)
    assert levels(db, variant_id) == (1, 1)
    assert ledger(db, variant_id)[-1] == ("ADJUSTMENT", -4, 1)


def test_reserve_is_all_or_nothing(db: Session, variant_id: int) -> None:
    other = make_variant(db)
    make_inventory(db, other, on_hand=1)
    inventory.adjust(db, variant_id, T.RESTOCK, 5, note=None, actor_id=None)
    with pytest.raises(AppError) as excinfo:
        inventory.reserve(db, [StockLine(variant_id, 2), StockLine(other.id, 2)])
    assert excinfo.value.code == "OUT_OF_STOCK"
    assert excinfo.value.details == {"items": [{"variant_id": other.id, "available": 1}]}
    assert levels(db, variant_id) == (5, 0)


def test_release_and_returns(db: Session, variant_id: int) -> None:
    inventory.adjust(db, variant_id, T.RESTOCK, 4, note=None, actor_id=None)
    inventory.reserve(db, [StockLine(variant_id, 3)])
    inventory.release(db, [StockLine(variant_id, 3)])
    assert levels(db, variant_id) == (4, 0)
    order = make_order(db, make_user(db))
    inventory.restock_returned(db, [StockLine(variant_id, 1)], order_id=order.id, actor_id=None)
    assert ledger(db, variant_id)[-1] == ("RETURN", 1, 5)


# --- concurrency (real commits on separate connections) ---------------------


@pytest.fixture
def committed_variant(engine: Engine) -> Iterator[int]:
    """A variant committed for real, so parallel sessions can see and lock it."""
    tag = uuid.uuid4().hex[:8]
    with Session(engine) as session:
        brand = Brand(name=f"Brand {tag}", slug=f"brand-{tag}")
        category = Category(name=f"Cat {tag}", slug=f"cat-{tag}")
        session.add_all([brand, category])
        session.flush()
        product = Product(name="P", slug=f"p-{tag}", brand_id=brand.id, category_id=category.id)
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
        session.add(Inventory(variant_id=variant.id))
        session.commit()
        ids = (variant.id, product.id, brand.id, category.id)
    yield ids[0]
    with Session(engine) as session:
        session.execute(
            delete(InventoryTransaction).where(InventoryTransaction.variant_id == ids[0])
        )
        session.execute(delete(Inventory).where(Inventory.variant_id == ids[0]))
        session.execute(delete(ProductVariant).where(ProductVariant.id == ids[0]))
        session.execute(delete(Product).where(Product.id == ids[1]))
        session.execute(delete(Brand).where(Brand.id == ids[2]))
        session.execute(delete(Category).where(Category.id == ids[3]))
        session.commit()


def run_parallel(count: int, work: object) -> list[BaseException]:
    errors: list[BaseException] = []
    start = threading.Barrier(count)

    def runner() -> None:
        start.wait()
        try:
            work()  # type: ignore[operator]
        except BaseException as exc:
            errors.append(exc)

    threads = [threading.Thread(target=runner) for _ in range(count)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return errors


def test_parallel_restocks_are_not_lost(engine: Engine, committed_variant: int) -> None:
    def restock() -> None:
        with Session(engine) as session:
            inventory.adjust(session, committed_variant, T.RESTOCK, 1, note=None, actor_id=None)
            session.commit()

    assert run_parallel(10, restock) == []
    with Session(engine) as session:
        assert levels(session, committed_variant) == (10, 0)
        after = sorted(t[2] for t in ledger(session, committed_variant))
        assert after == list(range(1, 11))  # every ledger row saw a distinct level


def test_last_item_can_only_be_reserved_once(engine: Engine, committed_variant: int) -> None:
    with Session(engine) as session:
        inventory.adjust(session, committed_variant, T.RESTOCK, 1, note=None, actor_id=None)
        session.commit()

    def reserve() -> None:
        with Session(engine) as session:
            inventory.reserve(session, [StockLine(committed_variant, 1)])
            session.commit()

    errors = run_parallel(5, reserve)
    assert len(errors) == 4 and all(getattr(e, "code", None) == "OUT_OF_STOCK" for e in errors)
    with Session(engine) as session:
        assert levels(session, committed_variant) == (1, 1)


# --- admin endpoints ----------------------------------------------------------


@pytest.fixture
def admin_headers(db: Session) -> dict[str, str]:
    return auth_headers(make_user(db, role=UserRole.ADMIN, full_name="Shop Admin"))


def test_admin_adjust_and_history(
    client: TestClient, db: Session, variant_id: int, admin_headers: dict[str, str]
) -> None:
    url = f"{API}/admin/inventory/{variant_id}"
    restock = client.post(
        f"{url}/adjustments", json={"type": "RESTOCK", "quantity_delta": 6}, headers=admin_headers
    )
    assert restock.status_code == 200
    assert (restock.json()["on_hand"], restock.json()["availability"]) == (6, "in_stock")

    no_note = client.post(
        f"{url}/adjustments", json={"type": "DAMAGE", "quantity_delta": -1}, headers=admin_headers
    )
    assert no_note.status_code == 400 and no_note.json()["error"]["code"] == "NOTE_REQUIRED"

    damage = client.post(
        f"{url}/adjustments",
        json={"type": "DAMAGE", "quantity_delta": -2, "note": "Scratched"},
        headers=admin_headers,
    )
    assert damage.json()["on_hand"] == 4

    threshold = client.patch(url, json={"low_stock_threshold": 5}, headers=admin_headers)
    assert threshold.json()["availability"] == "low"

    low = client.get(f"{API}/admin/inventory/low-stock", headers=admin_headers).json()
    assert [r["variant_id"] for r in low] == [variant_id]

    history = client.get(
        f"{API}/admin/inventory/transactions",
        params={"variant_id": variant_id},
        headers=admin_headers,
    ).json()
    assert [
        (r["type"], r["quantity_delta"], r["on_hand_after"], r["created_by"])
        for r in history["items"]
    ] == [
        ("DAMAGE", -2, 4, "Shop Admin"),
        ("RESTOCK", 6, 6, "Shop Admin"),
    ]
    only_damage = client.get(
        f"{API}/admin/inventory/transactions", params={"type": "DAMAGE"}, headers=admin_headers
    ).json()
    assert only_damage["total"] == 1

    out = client.post(f"{url}/mark-out-of-stock", json={"note": "Recalled"}, headers=admin_headers)
    assert (out.json()["available"], out.json()["availability"]) == (0, "out")


def test_admin_inventory_list_filters(
    client: TestClient, db: Session, admin_headers: dict[str, str]
) -> None:
    plenty = make_variant(db, sku="PLENTY-1")
    make_inventory(db, plenty, on_hand=50)
    few = make_variant(db, sku="FEW-1")
    make_inventory(db, few, on_hand=2)
    none = make_variant(db, sku="NONE-1")
    make_inventory(db, none, on_hand=0)

    def skus(**params: str) -> list[str]:
        body = client.get(f"{API}/admin/inventory", params=params, headers=admin_headers).json()
        return [r["sku"] for r in body["items"]]

    assert skus(stock_status="in_stock") == ["PLENTY-1"]
    assert skus(stock_status="low") == ["FEW-1"]
    assert skus(stock_status="out") == ["NONE-1"]
    assert skus(q="few") == ["FEW-1"]
    assert skus(sort="available") == ["NONE-1", "FEW-1", "PLENTY-1"]
