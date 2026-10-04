# Vijai Opticians — online store

Website and API for Vijai Opticians, Bengaluru (Basaveshwar Nagar & Vijayanagar).

| Folder | What | Stack |
|---|---|---|
| [`frontend/`](frontend/README.md) | Storefront (and later the admin dashboard) | React 18, Redux Toolkit, Vite |
| [`backend/`](backend/README.md) | REST API: catalogue, cart, orders, payments, admin | FastAPI, SQLAlchemy 2, PostgreSQL, Alembic |
| [`docs/`](docs/) | Architecture plan and task list | |

Start with [`docs/ARCHITECTURE_PLAN.md`](docs/ARCHITECTURE_PLAN.md) for the design and [`docs/TASKS.md`](docs/TASKS.md) for progress.

## Run locally

Two terminals:

```bash
cd backend && uv run uvicorn app.main:app --reload   # API on http://localhost:8000
cd frontend && npm run dev                           # site on http://localhost:3000
```

First-time setup for each is in its README.

## Deployment

Vercel, on the shop's own accounts (vachanvijai@gmail.com): one project per folder (`frontend/`, `backend/`), Neon Postgres, and the site forwards `/api/*` to the backend so everything is same-origin. Setup steps: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

CI (GitHub Actions) runs lint, type checks and tests for whichever app a change touches.
