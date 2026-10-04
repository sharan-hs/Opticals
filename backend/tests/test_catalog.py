"""Public catalogue: what's visible, filters, search, sorting, facets, detail."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Brand, Category, Inventory, ProductVariant
from app.models.enums import ColorFamily, Gender, ProductStatus
from app.seed.catalog import seed_catalogue
from tests.factories import make_category, make_inventory, make_product, make_variant

API = "/api/v1"


@pytest.fixture
def catalogue(db: Session) -> None:
    seed_catalogue(db)


def slugs(response: Any) -> list[str]:
    assert response.status_code == 200, response.text
    return [p["slug"] for p in response.json()["items"]]


def stock(db: Session, sku: str, on_hand: int, reserved: int = 0, threshold: int = 3) -> None:
    variant = db.scalar(select(ProductVariant).where(ProductVariant.sku == sku))
    assert variant is not None
    inventory = db.get(Inventory, variant.id)
    assert inventory is not None
    inventory.on_hand, inventory.reserved, inventory.low_stock_threshold = (
        on_hand,
        reserved,
        threshold,
    )
    db.flush()


@pytest.mark.usefixtures("catalogue")
class TestListing:
    def test_lists_seeded_products_with_card_data(self, client: TestClient) -> None:
        response = client.get(f"{API}/products", params={"sort": "price_asc", "page_size": 2})
        body = response.json()
        assert body["total"] == 7 and body["total_pages"] == 4
        card = body["items"][0]
        assert card["slug"] == "ray-ban-rb4349"
        assert card["price_paise"] == 649_000
        assert [c["name"] for c in card["colors"]] == [
            "Transparent Brown",
            "Havana",
            "Transparent Green",
        ]
        assert card["image"]["public_id"] == "Products/orb4349_brown/orb4349_brown_1"
        assert card["availability"] == "out"
        assert response.headers["Cache-Control"] == "public, max-age=0, must-revalidate"
        assert response.headers["CDN-Cache-Control"].startswith("public, max-age=60")

    def test_hidden_products(self, client: TestClient, db: Session) -> None:
        sunglasses = db.scalar(select(Category).where(Category.slug == "sunglasses"))
        brand = db.scalar(select(Brand))
        assert sunglasses and brand
        draft = make_product(
            db,
            slug="draft-frame",
            status=ProductStatus.DRAFT,
            brand_id=brand.id,
            category_id=sunglasses.id,
        )
        make_variant(db, draft)
        make_product(db, slug="no-colours", brand_id=brand.id, category_id=sunglasses.id)
        inactive_colour = make_product(
            db, slug="inactive-colour", brand_id=brand.id, category_id=sunglasses.id
        )
        make_variant(db, inactive_colour, is_active=False)
        listed = slugs(client.get(f"{API}/products", params={"page_size": 48}))
        assert not {"draft-frame", "no-colours", "inactive-colour"} & set(listed)
        assert client.get(f"{API}/products/draft-frame").status_code == 404

    def test_inactive_brand_hides_its_products(self, client: TestClient, db: Session) -> None:
        brand = db.scalar(select(Brand))
        assert brand
        brand.is_active = False
        db.flush()
        assert client.get(f"{API}/products").json()["total"] == 0

    def test_category_includes_subcategories(self, client: TestClient, db: Session) -> None:
        eyeglasses = db.scalar(select(Category).where(Category.slug == "eyeglasses"))
        reading = db.scalar(select(Category).where(Category.slug == "reading-glasses"))
        assert eyeglasses and reading
        product = make_product(
            db, slug="reader-one", category_id=reading.id, brand_id=db.scalar(select(Brand.id))
        )
        make_variant(db, product)
        assert slugs(client.get(f"{API}/products", params={"category": "eyeglasses"})) == [
            "reader-one"
        ]
        assert (
            slugs(
                client.get(f"{API}/products", params={"category": "sunglasses", "page_size": 48})
            ).count("reader-one")
            == 0
        )

    @pytest.mark.parametrize(
        ("params", "expected"),
        [
            ({"color": "BLUE"}, {"ray-ban-balorama-rb4089", "ray-ban-wayfarer-puffer-rb4940"}),
            (
                {"color": ["PINK", "ROSE_GOLD"]},
                {"ray-ban-wayfarer-puffer-rb4940", "ray-ban-bain-bridge-rb3735"},
            ),
            ({"max_price": 7000}, {"ray-ban-rb4349"}),
            (
                {"min_price": 12000, "frame_shape": "WAYFARER"},
                {"ray-ban-new-wayfarer-rb2132", "ray-ban-wayfarer-puffer-rb4940"},
            ),
            ({"material": "METAL"}, {"ray-ban-round-metal-rb3447"}),
            ({"q": "wayfarers"}, {"ray-ban-new-wayfarer-rb2132", "ray-ban-wayfarer-puffer-rb4940"}),
            ({"q": "rb4349"}, {"ray-ban-rb4349"}),
            ({"q": "ORB4089-OP"}, {"ray-ban-balorama-rb4089"}),
            ({"q": "balorma"}, {"ray-ban-balorama-rb4089"}),  # typo: trigram match
            ({"q": "ray-ban", "brand": "ray-ban"}, None),  # brand name matches all 7
        ],
    )
    def test_filters(
        self, client: TestClient, params: dict[str, Any], expected: set[str] | None
    ) -> None:
        found = set(slugs(client.get(f"{API}/products", params={**params, "page_size": 48})))
        assert found == expected if expected is not None else len(found) == 7

    def test_in_stock_filter(self, client: TestClient, db: Session) -> None:
        stock(db, "ORB4349-HAVANA", on_hand=2)
        stock(db, "ORB2132", on_hand=1, reserved=1)  # all held by an order
        assert slugs(client.get(f"{API}/products", params={"in_stock": "true"})) == [
            "ray-ban-rb4349"
        ]

    def test_sorting(self, client: TestClient) -> None:
        by_price = slugs(
            client.get(f"{API}/products", params={"sort": "price_desc", "page_size": 48})
        )
        assert by_price[-1] == "ray-ban-rb4349"
        by_name = slugs(client.get(f"{API}/products", params={"sort": "name_asc", "page_size": 48}))
        assert by_name[0] == "ray-ban-bain-bridge-rb3735"

    @pytest.mark.parametrize(
        "params", [{"page_size": 49}, {"page": 0}, {"color": "PLAID"}, {"sort": "random"}]
    )
    def test_invalid_parameters(self, client: TestClient, params: dict[str, Any]) -> None:
        assert client.get(f"{API}/products", params=params).status_code == 422

    def test_facets_ignore_their_own_filter(self, client: TestClient) -> None:
        facets = client.get(f"{API}/products/facets", params={"color": "BLUE"}).json()
        colours = {f["value"]: f["count"] for f in facets["colors"]}
        assert colours["BLACK"] == 2  # still offered while BLUE is selected
        assert facets["brands"] == [{"value": "ray-ban", "label": "Ray-Ban", "count": 2}]
        assert facets["price"] == {"min": 10990, "max": 12490}


@pytest.mark.usefixtures("catalogue")
class TestDetail:
    def test_variants_with_availability_buckets_only(self, client: TestClient, db: Session) -> None:
        stock(db, "ORB4349-BROWN", on_hand=10)
        stock(db, "ORB4349-HAVANA", on_hand=2)
        body = client.get(f"{API}/products/ray-ban-rb4349").json()
        assert [(v["sku"], v["availability"]) for v in body["variants"]] == [
            ("ORB4349-BROWN", "in_stock"),
            ("ORB4349-HAVANA", "low"),
            ("ORB4349-GREEN", "out"),
        ]
        assert body["availability"] == "in_stock"
        assert "on_hand" not in str(body) and "reserved" not in str(body)
        havana = body["variants"][1]
        assert havana["price_paise"] == 719_000 and len(havana["images"]) == 6
        assert havana["images"][0]["is_primary"] and havana["images"][0]["version"] == 1775294749

    def test_discount(self, client: TestClient, db: Session) -> None:
        variant = db.scalar(select(ProductVariant).where(ProductVariant.sku == "ORB2132"))
        assert variant
        variant.price_paise = 999_200  # MRP 12,490 -> 9,992 = 20% off
        db.flush()
        card = client.get(f"{API}/products/ray-ban-new-wayfarer-rb2132").json()
        assert card["discount_pct"] == 20

    def test_related_excludes_itself(self, client: TestClient) -> None:
        related = client.get(f"{API}/products/ray-ban-rb4349/related", params={"limit": 3}).json()
        assert len(related) == 3
        assert "ray-ban-rb4349" not in [p["slug"] for p in related]

    def test_unknown_product(self, client: TestClient) -> None:
        response = client.get(f"{API}/products/nope")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"


def test_category_tree_hides_inactive(client: TestClient, db: Session) -> None:
    seed_catalogue(db)
    kids = db.scalar(select(Category).where(Category.slug == "kids-eyeglasses"))
    assert kids
    kids.is_active = False
    db.flush()
    tree = client.get(f"{API}/categories").json()
    eyeglasses = next(c for c in tree if c["slug"] == "eyeglasses")
    assert [c["slug"] for c in eyeglasses["children"]] == ["reading-glasses", "blue-light-glasses"]
    assert client.get(f"{API}/brands").json() == [{"slug": "ray-ban", "name": "Ray-Ban"}]


def test_inactive_parent_category_hides_products(client: TestClient, db: Session) -> None:
    parent = make_category(db, name="Frames", slug="frames")
    child = make_category(db, name="Round", slug="round", parent_id=parent.id)
    product = make_product(db, slug="round-one", category_id=child.id, gender=Gender.MEN)
    make_inventory(db, make_variant(db, product, color_family=ColorFamily.BLACK))
    assert slugs(client.get(f"{API}/products")) == ["round-one"]
    parent.is_active = False
    db.flush()
    assert slugs(client.get(f"{API}/products")) == []


def test_products_are_unaffected_by_other_products_variants(
    client: TestClient, db: Session
) -> None:
    product = make_product(db, slug="solo")
    make_variant(db, product, price_paise=500_00, mrp_paise=500_00)
    other = make_product(db, slug="other")
    make_variant(db, other, price_paise=100_00, mrp_paise=100_00)
    body = client.get(f"{API}/products", params={"sort": "price_asc"}).json()
    assert [(p["slug"], p["price_paise"]) for p in body["items"]] == [
        ("other", 10000),
        ("solo", 50000),
    ]
