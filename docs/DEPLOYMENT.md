# Deployment (Vercel, owner's accounts)

Every hosting and service account belongs to the shop: **vachanvijai@gmail.com**. No developer's personal account should own anything the live site depends on. Developers are invited as collaborators and can be removed later without breaking anything.

## Shape

```
Browser ──> www.<domain>  (Vercel project "vijai-opticians", root: frontend/)
              │  static site; /api/* is forwarded (frontend/vercel.json)
              ▼
            vijai-opticians-api.vercel.app  (Vercel project "vijai-opticians-api", root: backend/)
              │  FastAPI as a Python function (backend/vercel.json, backend/api/index.py)
              ▼
            Neon Postgres (added from the Vercel Marketplace; Singapore region)
```

Why `/api` goes through the website's own domain: the login refresh cookie must be first-party. Two `*.vercel.app` hosts count as different sites, and Safari/Chrome block cookies between them. With the forward, the browser only ever talks to `www.<domain>`, so there's no CORS and no third-party cookie. Local development does the same through the Vite proxy.

## Accounts (all signed up with vachanvijai@gmail.com)

| Service | Needed for | When |
|---|---|---|
| GitHub | Owns the `Opticals` repository; Vercel deploys from it | Now |
| Vercel | Hosting for both projects | Now |
| Neon (via Vercel Marketplace) | Production database | Now |
| Cloudinary | Product images. **Check:** the site uses cloud `dyf8dp9oo`. If that isn't the owner's account, create one and move the images | Before launch |
| Razorpay | Payments (needs the shop's KYC: PAN, GST, bank account) | Phase 6 |
| Email provider (e.g. Resend) | Order and password-reset emails | Phase 3/9 |
| Sentry | Error alerts | Before launch |
| Domain registrar | `www.<domain>` | Before launch |

**Vercel plan:** Hobby (free) is for non-commercial use only, so a store that takes payments must be on **Pro** (about $20/month). Pro also allows scheduled jobs more often than once a day.

## One-time setup

### 1. Move the repository to the owner
1. Create a GitHub account with vachanvijai@gmail.com.
2. In `sharan-hs/Opticals` → Settings → General → Danger zone → **Transfer**, enter the owner's username. GitHub redirects the old URL automatically.
3. The owner adds the developer as a collaborator: Settings → Collaborators.
4. Developer, locally: `git remote set-url origin https://github.com/<owner>/Opticals.git`.

### 2. Vercel projects
1. Sign up at vercel.com with **Continue with GitHub** (the owner's GitHub), and allow access to the `Opticals` repo.
2. **Backend first.** Add New → Project → `Opticals`:
   - Project name: `vijai-opticians-api`. This name sets the URL the frontend forwards to; if it differs, update `frontend/vercel.json`.
   - Root Directory: `backend`. Framework preset: Other.
3. **Database.** In the backend project: Storage → Create → Neon (Postgres), region Singapore (`ap-southeast-1`). Connect it to the project. Vercel adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`.
4. **Backend environment variables** (Settings → Environment Variables, Production):

   | Name | Value |
   |---|---|
   | `APP_ENV` | `production` |
   | `DATABASE_URL` | set by Neon (pooled) |
   | `JWT_SECRET` | output of `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
   | `CORS_ORIGINS` | `https://www.<domain>` (until there's a domain: `https://vijai-opticians.vercel.app`) |
   | `FRONTEND_URL` | same as above |
   | `SENTRY_DSN` | optional |

   Later phases add Razorpay, Cloudinary and email keys here too, and only here.
5. **Frontend.** Add New → Project → `Opticals` again: name `vijai-opticians`, Root Directory `frontend` (Vite is detected). Variable `VITE_CLOUDINARY_CLOUD_NAME` is only needed if it differs from the default.
6. Open `https://vijai-opticians.vercel.app/api/v1/...` once API routes exist, or check the backend directly at `https://vijai-opticians-api.vercel.app/health/ready`.

### 3. Migrations
Production migrations run from GitHub Actions (`.github/workflows/migrate.yml`) whenever migrations reach `main`, and can be started by hand (Actions → Migrate production database → Run workflow).
1. GitHub (owner's repo) → Settings → Environments → New environment `production`.
2. Add secret `MIGRATION_DATABASE_URL` = Neon's **unpooled** URL (`DATABASE_URL_UNPOOLED` in Vercel).
3. Run the workflow once, then `/health/ready` should report `"migrations": "ok"`.
4. Load the starting catalogue once, from a developer machine:
   `cd backend && APP_ENV=staging DATABASE_URL='<Neon unpooled URL>' uv run python -m app.cli seed`
   (re-running is safe; it never overwrites stock counts or edited settings).

Vercel deploys new code while the workflow migrates, so every migration must work with both the old and new code (expand → backfill → contract).

### 4. Domain
Vercel → `vijai-opticians` project → Settings → Domains → add `www.<domain>` and `<domain>` (redirect to www), then set the DNS records Vercel shows at the registrar. The API needs no domain of its own.

## Serverless notes (affect later phases)

- **No long-running process.** Work after a response (emails) must finish within the request, or use Vercel's background facilities. Recurring jobs use Vercel Cron calling protected endpoints.
- **Expiring unpaid orders:** release expired stock reservations as part of each checkout (in the same transaction), and also sweep them with a cron job. This works even when cron runs only daily.
- **Rate limiting** is stored in Postgres, because in-memory counters reset whenever a new instance starts.
- **Database connections:** the app uses Neon's pooled URL; server-side prepared statements are off for compatibility (`app/core/database.py`).

## Who can change what

| Action | Who |
|---|---|
| Deploy | Automatic on push to `main` (preview deployments for pull requests) |
| Environment variables / secrets | Owner's Vercel and GitHub accounts only |
| Database | Owner's Neon (through Vercel) |
| Developer access | Collaborator on GitHub, member of the Vercel team (Pro), both removable |
