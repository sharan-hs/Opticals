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
```

## Layout

```
app/
  main.py          app factory: middleware, error handlers, routers
  cli.py           admin commands (Typer)
  core/            config, database session, errors, logging, middleware,
                   pagination, money (paise), migrations check, Sentry
  models/          SQLAlchemy models; one Base.metadata for Alembic
  modules/<name>/  one folder per feature: router → service → repository
alembic/           migrations
tests/
```

Conventions:
- Money is integer **paise** everywhere; convert at the edges with `app.core.money`.
- Services raise `AppError` subclasses (`NotFoundError`, `ConflictError`, …); the API turns them into
  `{"error": {"code", "message", "details"}, "request_id"}`.
- Services own the transaction (`db.commit()`); `get_db` rolls back anything uncommitted.

## Endpoints so far

| | |
|---|---|
| `GET /health` | Process is up (no DB) |
| `GET /health/ready` | DB reachable and migrations at head; 503 otherwise |
| `/api/v1/...` | Feature routes (from Phase 3) |

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

## Configuration

All settings come from environment variables (see `.env.example`); locally they're read from
`backend/.env`, which is git-ignored. In production the app refuses to start with the default or a
short `JWT_SECRET`, or with localhost in `CORS_ORIGINS`. API docs (`/docs`) are disabled in
production.
