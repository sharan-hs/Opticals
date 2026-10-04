"""Admin commands: `uv run python -m app.cli --help`."""

from pathlib import Path

import typer
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal, engine
from app.core.erd import render_er_markdown
from app.core.migrations import current_heads, expected_heads
from app.models import Base
from app.seed.catalog import reset_catalogue, seed_catalogue

cli = typer.Typer(no_args_is_help=True, help="Vijai Opticians API admin commands.")


@cli.command()
def check() -> None:
    """Show the environment, check the database connection and migration state."""
    settings = get_settings()
    url = make_url(settings.sqlalchemy_url)
    typer.echo(f"Environment: {settings.app_env}")
    typer.echo(f"Database:    {url.render_as_string(hide_password=True)}")

    with engine.connect() as conn:
        version = conn.execute(text("SHOW server_version")).scalar_one()
        typer.echo(f"Postgres:    {version}")
        current, expected = current_heads(conn), expected_heads()

    typer.echo(f"Migrations:  current={sorted(current) or 'none'} expected={sorted(expected)}")
    if current != expected:
        typer.secho("Database is not up to date: run `uv run alembic upgrade head`", fg="yellow")
        raise typer.Exit(code=1)
    typer.secho("OK", fg="green")


@cli.command()
def seed(
    reset: bool = typer.Option(
        False, "--reset", help="Empty the catalogue tables first (development only)."
    ),
) -> None:
    """Load categories, brands, the starting products, images and default settings.

    Safe to run repeatedly: existing stock counts and changed settings are kept.
    """
    settings = get_settings()
    if reset and settings.app_env != "development":
        typer.secho("--reset is only allowed when APP_ENV=development", fg="red")
        raise typer.Exit(code=1)

    with SessionLocal() as db, db.begin():
        if reset:
            reset_catalogue(db)
        summary = seed_catalogue(db)
        _print_counts(db)

    typer.echo(
        f"Added: {summary.categories} categories, {summary.brands} brands, "
        f"{summary.products} products, {summary.variants} variants, "
        f"{summary.images} images, {summary.settings} settings"
    )


def _print_counts(db: Session) -> None:
    for table in ("categories", "brands", "products", "product_variants", "product_images"):
        count = db.execute(text(f"SELECT count(*) FROM {table}")).scalar_one()  # noqa: S608
        typer.echo(f"  {table:<17} {count}")


@cli.command("er-diagram")
def er_diagram(
    output: Path = typer.Option(
        Path(__file__).resolve().parents[2] / "docs" / "DATABASE.md",
        help="Markdown file to write.",
    ),
) -> None:
    """Write the entity-relationship diagram (Mermaid) generated from the models."""
    output.write_text(render_er_markdown(Base.metadata))
    typer.echo(f"Wrote {output}")


if __name__ == "__main__":
    cli()
