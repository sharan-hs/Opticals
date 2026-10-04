from sqlalchemy import func, select
from sqlalchemy.orm import Session
from typer.testing import CliRunner

from app.cli import cli
from app.models import Inventory, Product, ProductImage, ProductVariant, StoreSetting
from app.seed.catalog import seed_catalogue


def count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def test_seed_loads_starting_catalogue(db: Session) -> None:
    seed_catalogue(db)
    assert count(db, Product) == 7
    assert count(db, ProductVariant) == 11
    assert count(db, ProductImage) == 64
    assert count(db, Inventory) == 11

    rb4349 = db.scalar(select(Product).where(Product.slug == "ray-ban-rb4349"))
    assert rb4349 is not None
    colours = db.scalars(
        select(ProductVariant.color_name)
        .where(ProductVariant.product_id == rb4349.id)
        .order_by(ProductVariant.sort_order)
    ).all()
    assert colours == ["Transparent Brown", "Havana", "Transparent Green"]

    havana = db.scalar(select(ProductVariant).where(ProductVariant.sku == "ORB4349-HAVANA"))
    assert havana is not None and havana.price_paise == 719_000
    primary = db.scalars(
        select(ProductImage.public_id).where(
            ProductImage.variant_id == havana.id, ProductImage.is_primary
        )
    ).all()
    assert primary == ["Products/orb4349_havana/orb4349_havana_1"]


def test_seed_is_idempotent_and_keeps_stock_and_settings(db: Session) -> None:
    seed_catalogue(db)
    variant = db.scalar(select(ProductVariant).where(ProductVariant.sku == "ORB2132"))
    assert variant is not None
    inventory = db.get(Inventory, variant.id)
    assert inventory is not None
    inventory.on_hand = 7
    fee = db.get(StoreSetting, "shipping_fee_paise")
    assert fee is not None
    fee.value = 9900
    db.flush()

    summary = seed_catalogue(db)

    assert (summary.products, summary.variants, summary.images) == (0, 0, 0)
    assert count(db, ProductImage) == 64
    db.refresh(inventory)
    db.refresh(fee)
    assert inventory.on_hand == 7
    assert fee.value == 9900


def test_reset_refused_outside_development() -> None:
    # The test run has APP_ENV=test, so this must stop before touching the database.
    result = CliRunner().invoke(cli, ["seed", "--reset"])
    assert result.exit_code == 1
    assert "only allowed when APP_ENV=development" in result.output
