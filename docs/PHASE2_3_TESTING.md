# Phases 2–3 (backend foundation + database): what to check

Branch: `phase2/backend-foundation`. There are no customer-facing API endpoints yet (login, products, cart arrive in Phases 4–8), so this is about the server, the database and the tooling.

`uv` is installed in `~/.local/bin`. Either run it as `~/.local/bin/uv`, or add it to your shell once:
```bash
echo 'source $HOME/.local/bin/env' >> ~/.zshrc && source ~/.zshrc
```

## 1. Start the API

```bash
cd backend
uv run uvicorn app.main:app --reload
```
- [ ] http://localhost:8000/health shows `{"status":"ok",...}`
- [ ] http://localhost:8000/health/ready shows `"database":"ok","migrations":"ok"`
- [ ] http://localhost:8000/docs opens the interactive API docs (only the two health endpoints for now). Try **Try it out → Execute** on each.
- [ ] http://localhost:8000/api/v1/anything returns the standard error format: `{"error": {"code": "NOT_FOUND", ...}, "request_id": "..."}`
- [ ] Quit Postgres.app, then reload `/health/ready`: it should return status 503 with `"database":"error"`. Start Postgres.app again and it recovers.

## 2. Automated checks (same as CI)

```bash
cd backend
uv run pytest                 # 70 tests
uv run ruff check . && uv run mypy app tests alembic/env.py
uv run python -m app.cli check
```

## 3. Look at the data

Postgres.app → double-click **opticals_dev** (opens a `psql` terminal). Paste:

```sql
\dt
```
- [ ] 21 tables plus `alembic_version`

```sql
SELECT p.name AS product, v.color_name, v.sku, v.price_paise / 100 AS price_rupees,
       (SELECT count(*) FROM product_images i WHERE i.variant_id = v.id) AS images,
       inv.on_hand
FROM products p
JOIN product_variants v ON v.product_id = p.id
JOIN inventory inv ON inv.variant_id = v.id
ORDER BY p.name, v.sort_order;
```
- [ ] 11 rows: RB4349 has 3 colours, Balorama and Wayfarer Puffer have 2, the rest 1; prices match the website; stock is 0

Try breaking the rules. Each statement must fail with the constraint name shown:
```sql
UPDATE product_variants SET price_paise = mrp_paise + 1 WHERE sku = 'ORB2132';
-- ck_product_variants_price_within_mrp
UPDATE inventory SET reserved = on_hand + 1;
-- ck_inventory_reserved_within_on_hand
INSERT INTO brands (name, slug) VALUES ('RAY-BAN', 'rayban');
-- uq_brands_name  (names are case-insensitive)
```

Search works inside the database:
```sql
SELECT name FROM products WHERE search_vector @@ websearch_to_tsquery('english', 'wayfarer');
-- New Wayfarer, Wayfarer Puffer
```

Prefer a GUI? TablePlus or DBeaver (both free) with host `localhost`, port 5432, database `opticals_dev`, user `opticals`; the password is in `backend/.env`.

## 4. The schema diagram

[`docs/DATABASE.md`](DATABASE.md) renders as diagrams on GitHub:
https://github.com/sharan-hs/Opticals/blob/phase2/backend-foundation/docs/DATABASE.md

## 5. Frontend after the folder move

The app moved from `website4/` to `website4/frontend/`:
```bash
cd frontend
npm run dev        # http://localhost:3000
```
- [ ] The site works as before.
- [ ] With the API also running, http://localhost:3000/api/v1/anything returns the API's JSON error. This proves the `/api` pass-through the live site will use.

## Not testable yet

- Vercel deployment: needs the owner's accounts (`docs/DEPLOYMENT.md`).
- GitHub Actions CI: runs when a pull request is opened.
- Login, product API, cart, orders, payments: Phases 4–8.
