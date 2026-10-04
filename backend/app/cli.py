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
from app.core.security import hash_password
from app.core.validators import check_password_policy
from app.models import Base, User
from app.models.enums import UserRole
from app.modules.auth.repository import get_user_by_email
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


@cli.command("create-admin")
def create_admin(
    email: str = typer.Option(..., prompt=True),
    full_name: str = typer.Option("Store Admin", prompt="Full name"),
) -> None:
    """Create an admin account, or make an existing account an admin.

    The password is asked for interactively and never appears in shell history.
    """
    email = email.strip().lower()
    with SessionLocal() as db:
        user = get_user_by_email(db, email)
        if user is not None:
            if user.role == UserRole.ADMIN:
                typer.echo(f"{email} is already an admin.")
                return
            typer.confirm(f"{email} exists. Make this account an admin?", abort=True)
            user.role = UserRole.ADMIN
            user.is_active = True
            db.commit()
            typer.secho(f"{email} is now an admin.", fg="green")
            return

        password = typer.prompt("Password", hide_input=True, confirmation_prompt=True)
        try:
            check_password_policy(password, email=email)
        except ValueError as exc:
            typer.secho(str(exc), fg="red")
            raise typer.Exit(code=1) from exc
        db.add(
            User(
                email=email,
                full_name=full_name.strip(),
                password_hash=hash_password(password),
                role=UserRole.ADMIN,
            )
        )
        db.commit()
    typer.secho(f"Admin {email} created.", fg="green")


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
