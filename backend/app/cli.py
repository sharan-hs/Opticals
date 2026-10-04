"""Admin commands: `uv run python -m app.cli --help`.

create-admin and seed-catalog arrive with the auth and catalogue phases.
"""

import typer
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.core.database import engine
from app.core.migrations import current_heads, expected_heads

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


@cli.callback()
def main() -> None:
    """Keeps `check` as a subcommand while it is the only one."""


if __name__ == "__main__":
    cli()
