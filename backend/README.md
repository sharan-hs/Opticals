# Vijai Opticians API

FastAPI + PostgreSQL. Synchronous SQLAlchemy 2 (psycopg 3), Alembic migrations, Pydantic settings.

## Setup (once)

1. Install [uv](https://docs.astral.sh/uv/) and Python 3.12:
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   uv python install 3.12
   ```
2. PostgreSQL 16+ (on macOS, [Postgres.app](https://postgresapp.com)). Create a role and two databases:
   ```sql
   CREATE ROLE opticals LOGIN PASSWORD '<choose one>';
   CREATE DATABASE opticals_dev OWNER opticals;
   CREATE DATABASE opticals_test OWNER opticals;
   ```
3. Configure and install:
   ```bash
   cd backend
   cp .env.example .env      # put the password in both URLs; generate JWT_SECRET
   uv sync                   # creates .venv with all dependencies
   uv run alembic upgrade head
   uv run python -m app.cli seed     # starting catalogue (safe to re-run)
   uv run python -m app.cli check
   ```

## Everyday commands

```bash
uv run uvicorn app.main:app --reload    # http://localhost:8000, docs at /docs
uv run pytest                           # tests (wipe and migrate opticals_test)
uv run pytest --cov                     # with coverage
uv run ruff check . && uv run ruff format .
uv run mypy app tests alembic/env.py
uv run python -m app.cli --help         # admin commands
uv run python -m app.cli seed --reset   # dev only: empty and reload the catalogue
uv run python -m app.cli er-diagram     # regenerate docs/DATABASE.md after model changes
```

## Layout

```
app/
  main.py          app factory: middleware, error handlers, routers
  cli.py           admin commands (Typer)
  core/            config, database session, errors, logging, middleware,
                   pagination, money (paise), migrations check, Sentry
  models/          SQLAlchemy models by area (identity, catalog, inventory, cart,
                   orders, payments, admin); one Base.metadata for Alembic
  seed/            starting catalogue and default settings (idempotent)
  modules/<name>/  one folder per feature: router → service → repository
alembic/           migrations
tests/
```

Conventions:
- Schema diagram: `docs/DATABASE.md` (generated). The database enforces the rules it can
  (CHECKs, unique and partial-unique indexes); `tests/test_schema.py` proves each one.
- Status columns use `enum_column()` (varchar + CHECK named `ck_<table>_<column>`).
- Relationships default to `lazy="raise"`: load what you need with `selectinload`/`joinedload`.
- Money is integer **paise** everywhere; convert at the edges with `app.core.money`.
- Services raise `AppError` subclasses (`NotFoundError`, `ConflictError`, …); the API turns them into
  `{"error": {"code", "message", "details"}, "request_id"}`.
- Services own the transaction (`db.commit()`); `get_db` rolls back anything uncommitted.

## Endpoints so far

| | |
|---|---|
| `GET /health` | Process is up (no DB) |
| `GET /health/ready` | DB reachable and migrations at head; 503 otherwise |
| `POST /api/v1/auth/register`, `/login` | Create account / sign in → access token + refresh cookie |
| `POST /api/v1/auth/refresh`, `/logout` | Cookie-based; need header `X-Requested-With: fetch` |
| `POST /api/v1/auth/logout-all`, `/change-password` | Signed in |
| `POST /api/v1/auth/forgot-password`, `/reset-password` | Emailed single-use link (30 min) |
| `GET/PATCH /api/v1/me` | Profile |
| `/api/v1/me/addresses` | List, add, edit, delete, `/{id}/default` |
| `GET /api/v1/products` (+ `/facets`, `/{slug}`, `/{slug}/related`), `/categories`, `/brands` | Public catalogue: filters, search, sort, availability buckets |
| `/api/v1/admin/...` | Products, colours, photos, categories, brands, stock, stock history (ADMIN only) |

Auth model: a 15-minute JWT access token sent as `Authorization: Bearer …` (kept in memory
by the frontend) and a 30-day refresh token in an httpOnly cookie scoped to `/api/v1/auth`,
rotated on every refresh; reusing an old refresh token signs that session out everywhere.
Rate limits (login, register, forgot/reset password) are counted in Postgres. In development
emails are printed to the server log, including password-reset links.

Create the first admin: `uv run python -m app.cli create-admin` (prompts for the password).

## Migrations

1. Change or add a model in `app/models/` (and import it in `app/models/__init__.py`).
2. `uv run alembic revision --autogenerate -m "short description"`
3. **Read and fix the generated file.** Autogenerate misses or garbles CHECK constraints,
   partial indexes, computed columns, renames and data backfills.
4. `uv run alembic upgrade head`, then `uv run alembic downgrade -1` and upgrade again to prove
   it reverses.
5. Commit the model change and its migration together. CI applies, reverses and re-applies
   all migrations on a fresh database.

Rules: never edit a migration that has been applied anywhere shared; never change a production
schema by hand; for breaking changes use expand → backfill → contract across releases. Seed
data belongs in `app/cli.py`, not in migrations.

## Deployment

Vercel Python function (`vercel.json`, `api/index.py`) with Neon Postgres; production migrations run
from GitHub Actions with `MIGRATION_DATABASE_URL` (the database's direct, unpooled URL). Full steps:
`../docs/DEPLOYMENT.md`.

## Configuration

All settings come from environment variables (see `.env.example`); locally they're read from
`backend/.env`, which is git-ignored. In production the app refuses to start with the default or a
short `JWT_SECRET`, or with localhost in `CORS_ORIGINS`. API docs (`/docs`) are disabled in
production.
