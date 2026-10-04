"""Admin catalogue: access control, products, variants, images, categories, brands."""

from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import AuditLog, Cart, CartItem, InventoryTransaction, User
from app.models.enums import UserRole
from app.modules.media.cloudinary import sign
from tests.factories import auth_headers, make_brand, make_category, make_user

API = "/api/v1"


@pytest.fixture
def admin(db: Session) -> User:
    return make_user(db, role=UserRole.ADMIN, full_name="Shop Admin")


@pytest.fixture
def headers(admin: User) -> dict[str, str]:
    return auth_headers(admin)


@pytest.fixture
def refs(db: Session) -> dict[str, int]:
    return {"brand_id": make_brand(db).id, "category_id": make_category(db).id}


def product_body(refs: dict[str, int], **extra: Any) -> dict[str, Any]:
    return {
        "name": "Clubmaster Classic",
        "model_number": "RB3016",
        "status": "ACTIVE",
        **refs,
        "variants": [
            {
                "sku": "RB3016-901",
                "color_name": "Black",
                "color_family": "BLACK",
                "mrp_paise": 1_090_000,
                "price_paise": 990_000,
                "initial_stock": 5,
            },
            {
                "sku": "RB3016-W0366",
                "color_name": "Havana",
                "color_family": "TORTOISE",
                "color_hex": "#7B3F00",
                "mrp_paise": 1_090_000,
                "price_paise": 1_090_000,
            },
        ],
        **extra,
    }


def create(client: TestClient, headers: dict[str, str], refs: dict[str, int], **extra: Any) -> Any:
    response = client.post(
        f"{API}/admin/products", json=product_body(refs, **extra), headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


# --- access -----------------------------------------------------------------


def admin_routes(app: FastAPI) -> list[tuple[str, str]]:
    out = []
    for path, operations in app.openapi()["paths"].items():
        if path.startswith("/api/v1/admin"):
            for name in ("product_id", "variant_id", "image_id", "category_id", "brand_id"):
                path = path.replace("{" + name + "}", "1")
            out += [(method.upper(), path) for method in operations]
    return out


def test_every_admin_route_requires_admin(app: FastAPI, client: TestClient, db: Session) -> None:
    routes = admin_routes(app)
    assert len(routes) >= 25
    customer = auth_headers(make_user(db))
    for method, path in routes:
        assert client.request(method, path).status_code == 401, (method, path)
        assert client.request(method, path, headers=customer).status_code == 403, (method, path)


# --- products ---------------------------------------------------------------


def test_create_product_with_variants_and_opening_stock(
    client: TestClient, db: Session, headers: dict[str, str], refs: dict[str, int], admin: User
) -> None:
    body = create(client, headers, refs)
    assert body["slug"].endswith("clubmaster-classic-rb3016")
    black, havana = body["variants"]
    assert (black["on_hand"], black["available"], black["availability"]) == (5, 5, "in_stock")
    assert (havana["on_hand"], havana["availability"]) == (0, "out")

    ledger = db.scalars(select(InventoryTransaction)).all()
    assert [(t.type, t.quantity_delta, t.note, t.created_by) for t in ledger] == [
        ("RESTOCK", 5, "Opening stock", admin.id)
    ]
    assert (
        db.scalar(select(AuditLog.action).where(AuditLog.entity_id == str(body["id"])))
        == "product.create"
    )

    # Published products show up in the shop straight away.
    listed = client.get(f"{API}/products").json()["items"]
    assert [(p["slug"], p["price_paise"], p["availability"]) for p in listed] == [
        (body["slug"], 990_000, "in_stock")
    ]


def test_slug_is_made_unique(
    client: TestClient, headers: dict[str, str], refs: dict[str, int]
) -> None:
    first = create(client, headers, refs)
    variants = [{**v, "sku": v["sku"] + "-B"} for v in product_body(refs)["variants"]]
    second = create(client, headers, refs, variants=variants)
    assert second["slug"] == first["slug"] + "-2"


def test_duplicate_sku_ignoring_case(
    client: TestClient, headers: dict[str, str], refs: dict[str, int]
) -> None:
    create(client, headers, refs)
    variants = [{**product_body(refs)["variants"][0], "sku": "rb3016-901"}]
    response = client.post(
        f"{API}/admin/products", json=product_body(refs, variants=variants), headers=headers
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SKU_TAKEN"


def test_price_above_mrp_rejected(
    client: TestClient, headers: dict[str, str], refs: dict[str, int]
) -> None:
    variants = [{**product_body(refs)["variants"][0], "price_paise": 2_000_000}]
    response = client.post(
        f"{API}/admin/products", json=product_body(refs, variants=variants), headers=headers
    )
    assert response.status_code == 422


def test_update_records_field_changes(
    client: TestClient, db: Session, headers: dict[str, str], refs: dict[str, int]
) -> None:
    product = create(client, headers, refs)
    response = client.patch(
        f"{API}/admin/products/{product['id']}",
        json={
            "name": "Clubmaster",
            "is_featured": True,
            "specifications": [{"label": "UV", "value": "UV400"}],
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["specifications"] == [{"label": "UV", "value": "UV400"}]
    changes = db.scalar(select(AuditLog.changes).where(AuditLog.action == "product.update"))
    assert changes is not None
    assert changes["name"] == ["Clubmaster Classic", "Clubmaster"]
    assert changes["is_featured"] == [False, True]


def test_cannot_publish_without_an_active_colour(
    client: TestClient, headers: dict[str, str], refs: dict[str, int]
) -> None:
    product = create(client, headers, refs, status="DRAFT")
    for variant in product["variants"]:
        client.patch(
            f"{API}/admin/variants/{variant['id']}", json={"is_active": False}, headers=headers
        )
    response = client.patch(
        f"{API}/admin/products/{product['id']}/status", json={"status": "ACTIVE"}, headers=headers
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "NO_ACTIVE_VARIANT"


def test_description_rejects_html(
    client: TestClient, headers: dict[str, str], refs: dict[str, int]
) -> None:
    response = client.post(
        f"{API}/admin/products",
        json=product_body(refs, description="<script>alert(1)</script>"),
        headers=headers,
    )
    assert response.status_code == 422


def test_delete_hides_product_and_clears_carts(
    client: TestClient, db: Session, headers: dict[str, str], refs: dict[str, int]
) -> None:
    product = create(client, headers, refs)
    shopper = make_user(db)
    cart = Cart(user_id=shopper.id)
    db.add(cart)
    db.flush()
    db.add(CartItem(cart_id=cart.id, variant_id=product["variants"][0]["id"], quantity=1))
    db.flush()

    assert (
        client.delete(f"{API}/admin/products/{product['id']}", headers=headers).status_code == 204
    )
    assert client.get(f"{API}/products/{product['slug']}").status_code == 404
    assert client.get(f"{API}/admin/products/{product['id']}", headers=headers).status_code == 404
    assert db.scalar(select(func.count()).select_from(CartItem)) == 0


def test_admin_list_filters(
    client: TestClient, headers: dict[str, str], refs: dict[str, int]
) -> None:
    create(client, headers, refs)
    rows = client.get(f"{API}/admin/products", headers=headers).json()["items"]
    assert rows[0]["variant_count"] == 2 and rows[0]["total_available"] == 5
    assert rows[0]["stock_status"] == "low"  # one colour has none
    assert (
        client.get(f"{API}/admin/products", params={"stock_status": "out"}, headers=headers).json()[
            "total"
        ]
        == 0
    )
    assert (
        client.get(f"{API}/admin/products", params={"q": "rb3016-w0"}, headers=headers).json()[
            "total"
        ]
        == 1
    )
    assert (
        client.get(f"{API}/admin/products", params={"status": "DRAFT"}, headers=headers).json()[
            "total"
        ]
        == 0
    )


# --- variants ---------------------------------------------------------------


def test_variant_add_update_delete(
    client: TestClient, headers: dict[str, str], refs: dict[str, int]
) -> None:
    product = create(client, headers, refs)
    added = client.post(
        f"{API}/admin/products/{product['id']}/variants",
        json={
            "sku": "RB3016-1367",
            "color_name": "Blue",
            "mrp_paise": 1_190_000,
            "price_paise": 1_190_000,
        },
        headers=headers,
    )
    assert added.status_code == 201
    blue = added.json()["variants"][-1]
    assert (blue["sku"], blue["sort_order"], blue["on_hand"]) == ("RB3016-1367", 2, 0)

    too_dear = client.patch(
        f"{API}/admin/variants/{blue['id']}", json={"price_paise": 1_200_000}, headers=headers
    )
    assert too_dear.status_code == 400 and too_dear.json()["error"]["code"] == "PRICE_ABOVE_MRP"

    removed = client.delete(f"{API}/admin/variants/{blue['id']}", headers=headers)
    assert [v["sku"] for v in removed.json()["variants"]] == ["RB3016-901", "RB3016-W0366"]


# --- images -----------------------------------------------------------------


def test_images_without_cloudinary_credentials(
    client: TestClient, headers: dict[str, str], refs: dict[str, int]
) -> None:
    product = create(client, headers, refs)
    black = product["variants"][0]["id"]
    url = f"{API}/admin/products/{product['id']}/images"

    first = client.post(
        url, json={"public_id": "uploads/test/a", "variant_id": black}, headers=headers
    )
    assert first.status_code == 201
    second = client.post(
        url,
        json={"public_id": "uploads/test/b", "variant_id": black, "is_primary": True},
        headers=headers,
    )
    images = second.json()["images"]
    assert [(i["public_id"], i["is_primary"]) for i in images] == [
        ("uploads/test/a", False),
        ("uploads/test/b", True),
    ]

    dup = client.post(url, json={"public_id": "uploads/test/a"}, headers=headers)
    assert dup.status_code == 409

    ids = [i["id"] for i in images]
    reordered = client.put(f"{url}/order", json={"image_ids": ids[::-1]}, headers=headers).json()[
        "images"
    ]
    assert [i["public_id"] for i in reordered] == ["uploads/test/b", "uploads/test/a"]

    after_delete = client.delete(f"{API}/admin/images/{ids[1]}", headers=headers).json()["images"]
    assert [(i["public_id"], i["is_primary"]) for i in after_delete] == [("uploads/test/a", True)]

    # The shop shows the colour's primary image.
    card = client.get(f"{API}/products").json()["items"][0]
    assert card["image"]["public_id"] == "uploads/test/a"


def test_image_for_another_products_colour_rejected(
    client: TestClient, headers: dict[str, str], refs: dict[str, int]
) -> None:
    first = create(client, headers, refs)
    variants = [{**v, "sku": v["sku"] + "-X"} for v in product_body(refs)["variants"]]
    second = create(client, headers, refs, variants=variants)
    response = client.post(
        f"{API}/admin/products/{second['id']}/images",
        json={"public_id": "uploads/x", "variant_id": first["variants"][0]["id"]},
        headers=headers,
    )
    assert response.status_code == 400


def test_upload_signature(
    client: TestClient,
    headers: dict[str, str],
    refs: dict[str, int],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    product = create(client, headers, refs)
    body = {"product_id": product["id"]}
    missing = client.post(f"{API}/admin/uploads/signature", json=body, headers=headers)
    assert missing.status_code == 503
    assert missing.json()["error"]["code"] == "IMAGES_NOT_CONFIGURED"

    settings = get_settings()
    monkeypatch.setattr(settings, "cloudinary_api_key", "key123")
    monkeypatch.setattr(settings, "cloudinary_api_secret", "secret456")
    signed = client.post(f"{API}/admin/uploads/signature", json=body, headers=headers).json()
    assert signed["folder"] == f"uploads/products/{product['slug']}"
    params = {k: signed[k] for k in ("allowed_formats", "folder", "timestamp")}
    assert signed["signature"] == sign(params, "secret456")
    assert "secret456" not in str(signed)


def test_cloudinary_signature_algorithm() -> None:
    # Example from Cloudinary's documentation.
    params = {
        "eager": "w_400,h_300,c_pad|w_260,h_200,c_crop",
        "public_id": "sample_image",
        "timestamp": 1315060510,
    }
    assert sign(params, "abcd") == "bfd09f95f331f558cbd1320e67aa8d488770583e"


# --- categories & brands ----------------------------------------------------


def test_category_rules(client: TestClient, headers: dict[str, str], refs: dict[str, int]) -> None:
    url = f"{API}/admin/categories"
    frames = client.post(url, json={"name": "Frames"}, headers=headers).json()
    assert frames["slug"] == "frames"
    round_ = client.post(
        url, json={"name": "Round", "parent_id": frames["id"]}, headers=headers
    ).json()

    too_deep = client.post(url, json={"name": "Tiny", "parent_id": round_["id"]}, headers=headers)
    assert too_deep.json()["error"]["code"] == "CATEGORY_DEPTH"
    own_parent = client.patch(
        f"{url}/{frames['id']}", json={"parent_id": frames["id"]}, headers=headers
    )
    assert own_parent.json()["error"]["code"] == "CATEGORY_CYCLE"
    parent_with_children = client.patch(
        f"{url}/{frames['id']}", json={"parent_id": refs["category_id"]}, headers=headers
    )
    assert parent_with_children.json()["error"]["code"] == "CATEGORY_DEPTH"
    duplicate = client.post(url, json={"name": "Again", "slug": "frames"}, headers=headers)
    assert duplicate.status_code == 409

    assert (
        client.delete(f"{url}/{frames['id']}", headers=headers).json()["error"]["code"]
        == "CATEGORY_IN_USE"
    )
    in_use = client.delete(f"{url}/{refs['category_id']}", headers=headers)
    assert in_use.status_code == 204  # no products yet
    assert client.delete(f"{url}/{round_['id']}", headers=headers).status_code == 204


def test_brand_rules(client: TestClient, headers: dict[str, str], refs: dict[str, int]) -> None:
    url = f"{API}/admin/brands"
    oakley = client.post(url, json={"name": "Oakley"}, headers=headers)
    assert oakley.status_code == 201 and oakley.json()["slug"] == "oakley"
    assert client.post(url, json={"name": "OAKLEY"}, headers=headers).status_code == 409
    create(client, headers, refs)
    in_use = client.delete(f"{url}/{refs['brand_id']}", headers=headers)
    assert in_use.status_code == 409
    listed = {b["name"]: b["product_count"] for b in client.get(url, headers=headers).json()}
    assert listed["Oakley"] == 0 and sum(listed.values()) == 1
