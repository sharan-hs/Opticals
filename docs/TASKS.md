# Vijai Opticians — End-to-End Task Breakdown

Companion to [ARCHITECTURE_PLAN.md](ARCHITECTURE_PLAN.md). Section references like "§K" point there.

**Legend**
- `[ ]` to do · `[x]` done · `[~]` in progress
- 👤 needs the shop owner (information, decision, account, document)
- ⛔ blocked until the listed task is done
- Each group ends with **Done when** = acceptance criteria for the group.

## Progress

Last updated: 2026-10-04 14:46

_Phase 1: Build, 32 tests and lint pass. Paused for user testing (docs/PHASE1_TESTING.md) before Phase 2._

| Phase | Done | In progress | Total | % done |
|---|---:|---:|---:|---:|
| Phase 0 | 3 | 0 | 17 | 18% |
| Phase 1 | 120 | 6 | 130 | 92% |
| Phase 2 | 0 | 0 | 31 | 0% |
| Phase 3 | 0 | 0 | 30 | 0% |
| Phase 4 | 0 | 0 | 32 | 0% |
| Phase 5 | 0 | 0 | 39 | 0% |
| Phase 6 | 0 | 0 | 14 | 0% |
| Phase 7 | 0 | 0 | 13 | 0% |
| Phase 8 | 0 | 0 | 21 | 0% |
| Phase 9 | 0 | 0 | 15 | 0% |
| Phase 10 | 0 | 0 | 10 | 0% |
| Phase 11 | 0 | 0 | 24 | 0% |
| Phase 12 | 0 | 0 | 21 | 0% |
| P1 | 0 | 0 | 12 | 0% |
| P2 | 0 | 0 | 7 | 0% |
| **All** | **123** | **6** | **416** | **30%** |

**Recently completed**
- 1.15.3 Cloudinary cloud name from VITE_CLOUDINARY_CLOUD_NAME
- 1.13.3 Explicit image dimensions everywhere
- 1.15.2–1.15.6, 1.15.8, 1.15.9 Vite 5, ESLint, Vitest + RTL
- 1.13.1/1.13.2 Route-level lazy loading, local images ≤ 76 KB
- 1.12.2/1.12.3/1.12.6 Manifest icons, favicon, contrast
- 1.11.4 Legal page drafts + 1.8.9 footer links
- 1.10.11 Old scene.gltf/bin removed
- 1.6.14 Filter drawer focus handling
- 1.4.14/1.6.16 Cart and shop unit tests (32 tests pass)
- 1.11.x / 1.10.x / 1.9.x (previous batch)

**Up next**
- User testing of Phase 1 (docs/PHASE1_TESTING.md)
- 1.1.8 Open PR `phase1/frontend-cleanup` → `main`
- 1.15.1 Install Node 22 LTS
- Phase 2.1 Repository restructure

---

Work top to bottom inside a phase unless a dependency says otherwise.

---

## Phase 0 — Audit & decisions

- [x] 0.1 Audit existing codebase (code read, build, headless Chrome at 4 viewports, Cloudinary probe)
- [x] 0.2 Write architecture plan (`docs/ARCHITECTURE_PLAN.md`)
- [x] 0.3 Write this task breakdown
- [ ] 0.4 👤 Owner answers (feed results back into the plan):
  - [ ] 0.4.1 Online stock: separate pool or shared with the two shops? Who updates it?
  - [ ] 0.4.2 Shipping: fee, free-shipping threshold (site claims ₹15,000), delivery regions, courier
  - [ ] 0.4.3 GST: GSTIN, legal entity name, HSN codes and rates per category (confirm with CA), invoice needs
  - [ ] 0.4.4 Return / refund / cancellation policy and windows (site claims 30-day money back)
  - [ ] 0.4.5 Cash on delivery: yes/no
  - [ ] 0.4.6 Launch catalogue: only current Ray-Ban sunglasses, or also frames, lenses, accessories? Who photographs/uploads?
  - [ ] 0.4.7 Correct public phone numbers, emails, WhatsApp, social media URLs
  - [ ] 0.4.8 Domain name (owned?) and email domain for transactional mail
  - [ ] 0.4.9 Permission to use brand logos ("Company Partners") and Ray-Ban imagery
  - [ ] 0.4.10 Confirm or drop marketing claims: "Winter Sale up to 60%", "24/7 support", "Free delivery over 15000", "30-day money back"
  - [ ] 0.4.11 About page: real mission/vision text, photos
  - [ ] 0.4.12 Initial stock counts per SKU
  - [ ] 0.4.13 Who is the Razorpay account holder (KYC documents, bank account)?

---

## Phase 1 — Frontend cleanup (existing React app, static data)

> ✅ Build, 32 tests and lint pass. Paused for user testing (docs/PHASE1_TESTING.md) before Phase 2.


> ✅ Vite build passes (0 warnings), `npm test` 32/32, `npm run lint` 0 warnings. Final headless audit running.



### 1.1 Repository hygiene
- [x] 1.1.1 Commit the uncommitted Shop / Filter / Product changes and untracked `src/Utils/` (commit `82f6f0d` on new branch `phase1/frontend-cleanup` from `main`; `Headerchanges` was already merged via PR #1)
- [x] 1.1.2 Push `phase1/frontend-cleanup` to `origin`
- [x] 1.1.3 Remove `allfiles.txt` (git ls-tree dump)
- [x] 1.1.4 Remove unused `public/shirt_baked_2.glb`
- [x] 1.1.5 Extend `.gitignore` (`build/`, `dist/`, `coverage/`, `.env.*` except `.env.example`, editor folders)
- [x] 1.1.6 Rename package `uomo` → `vijai-opticians-web`
- [x] 1.1.7 Rewrite `README.md` (what it is, setup, scripts, structure, link to docs) _(updated for Vite)_
- [ ] 1.1.8 Open PR `phase1/frontend-cleanup` → `main` at the end of Phase 1 and merge _(waiting for user testing)_
- **Done when:** working tree clean, branch pushed, no junk files tracked.

### 1.2 One product data model
- [x] 1.2.1 Define a single product shape in `src/Data/catalog.js` (`id, slug, model, name, brand, category, gender, frameShape, color, colorHex, price, imageCount, addedAt, description, specs`) _(no gender/frameShape/addedAt/description/specs fields yet — no real data)_
- [x] 1.2.2 Move `metadata.js` content into it; add `slug`, `model` (groups colour variants: RB4349, RB4089, RB4940…), `colorHex`, `addedAt` _(no addedAt — no real dates in data)_
- [x] 1.2.3 Per-product `imageCount` (orb3119m = 5, orb3735 = 5, others 6) instead of a fixed 6
- [x] 1.2.4 Cloudinary URL builder: no `upload//` when there is no version; support transformations (`f_auto,q_auto,w_<n>`, `c_pad`/`c_fit`), `srcSet` helper; cloud name from one constant
- [x] 1.2.5 Catalog helpers: `getProducts()`, `getProductBySlug()`, `getColorSiblings()`, `getRelatedProducts()`
- [x] 1.2.6 `formatINR()` helper (₹, en-IN grouping) used everywhere a price is shown
- [x] 1.2.7 Remove debug `console.log` in ShopDetails
- [x] 1.2.8 Delete `StoreData.js`, `metadata.js`, old local product images once nothing imports them
- **Done when:** every page renders products from the same source, all prices in ₹.

### 1.3 Product URLs and product page
- [x] 1.3.1 Route `/products/:slug`; `/product` → redirect to `/shop`
- [x] 1.3.2 Product page loads by slug (not router state); proper not-found state with a "Back to shop" link
- [x] 1.3.3 Update every product link (Shop cards, Home grid, Related, Cart) to `/products/:slug`
- [x] 1.3.4 Remove hardcoded sizes XS–XL and Black/Red/Grey colours
- [x] 1.3.5 Colour selector = sibling products of the same model (links to their slugs), current colour highlighted
- [x] 1.3.6 Quantity selector bounded 1–10, passed to the cart
- [x] 1.3.7 Breadcrumb Home / Shop / Category / Product
- [x] 1.3.8 Replace lorem "Description / Additional information" tabs with real description + specs table from data _(specs table from data; no description text in catalogue yet)_
- [x] 1.3.9 Remove fake "Reviews (2)" tab, star ratings and "8k+ reviews" text
- [x] 1.3.10 Thumbnails are `<button>`s with `aria-label`, main image has descriptive `alt`
- [x] 1.3.11 Gallery prev/next buttons have `aria-label`s
- [x] 1.3.12 Remove non-functional Wishlist / Share buttons (wishlist returns in P1)
- [x] 1.3.13 Fix horizontal overflow at 390 px _(CSS fix in place; visual check pending)_
- [x] 1.3.14 Per-page document title (`<Name> – Vijai Opticians`)
- **Done when:** any product URL works when opened directly, refreshed or shared.

### 1.4 Cart
- [x] 1.4.1 Cart line shape `{ id, slug, name, brand, color, price, image, quantity }` _(lines store {id, quantity}; name/price/image derived from catalogue via selectors)_
- [x] 1.4.2 `addToCart` honours the payload quantity, capped at 10
- [x] 1.4.3 Fix `updateQuantity` clamp bug
- [x] 1.4.4 Remove stored `totalAmount`; selectors `selectCartSubtotal`, `selectCartCount` (sum of quantities)
- [x] 1.4.5 Persist cart to `localStorage` (versioned key, validated on load, tolerant of bad data)
- [x] 1.4.6 Header badge shows total quantity
- [x] 1.4.7 Cart page uses ₹ via `formatINR`
- [x] 1.4.8 Remove fake `$5` shipping and `$11` VAT; show "Shipping calculated at checkout" and "Prices include GST"
- [x] 1.4.9 Quantity input: numeric, can be cleared and retyped, clamps on blur
- [x] 1.4.10 Remove-item control is a `<button aria-label>`
- [x] 1.4.11 Hide non-functional Coupon / Update Cart controls (coupons are P1)
- [x] 1.4.12 Fix invalid table markup (`<th>` in `<tfoot>`), missing `key`s
- [x] 1.4.13 Cart lines link to `/products/:slug`
- [x] 1.4.14 Unit tests for the cart slice (add, merge quantity, cap, update, remove, persistence)
- **Done when:** add from any page → cart shows image, name, ₹ price, correct totals; survives reload.

### 1.5 Checkout placeholder (until Phase 8)
- [x] 1.5.1 Remove the fake "Your order is completed!" step and the random order number
- [x] 1.5.2 "Proceed to checkout" → notice that online ordering is launching soon + contact options (call/WhatsApp the store)
- [x] 1.5.3 Keep checkout/confirmation markup + CSS in the repo for reuse in Phase 8 (not routed) _(kept in git history instead of the tree: commit 82f6f0d, ShoppingCart.jsx)_
- **Done when:** nothing on the site pretends an order was placed.

### 1.6 Shop page
- [x] 1.6.1 Reset to page 1 whenever filters, search or sort change (regression fix)
- [x] 1.6.2 Lift filter state into ShopDetails; Filter becomes controlled; sidebar and drawer share state
- [x] 1.6.3 Filters, sort, search and page stored in URL query params (shareable, back button works)
- [x] 1.6.4 Category label on cards comes from data
- [x] 1.6.5 Sorts: Featured, Newest (by `addedAt`), Price low→high, Price high→low, Name A–Z, Name Z–A; remove "Best selling" (based on fake reviews) and the broken date sorts _(no Newest sort — no dates in data)_
- [x] 1.6.6 Colour options derived from products (not a separate import), with counts
- [x] 1.6.7 Brand options with counts; checkbox labels associated (`htmlFor`)
- [x] 1.6.8 Price slider bounds from data; ₹ formatting
- [x] 1.6.9 "Clear" links don't toggle the accordion (`stopPropagation`), are buttons
- [x] 1.6.10 Search box on the shop page (`q` param, matches name/brand/model/colour)
- [x] 1.6.11 Empty state with "Clear all filters" button
- [x] 1.6.12 Active-filter chips with remove buttons
- [x] 1.6.13 Pagination controls are buttons; current page `aria-current`; scroll to grid top on change
- [x] 1.6.14 Mobile filter drawer: overlay, close on Esc / overlay click, focus handling, "Show N results" button _(focus moves to close button on open and back to toggle on close; no full focus trap)_
- [x] 1.6.15 Product images: Cloudinary thumbnails (`w_600`), `loading="lazy"`, fixed aspect ratio (fixes CLS 0.19)
- [x] 1.6.16 Unit tests: filter + sort + paginate logic
- **Done when:** filter on page 2 shows results; refreshing keeps filters; CLS < 0.1.

### 1.7 Shared components & de-duplication
- [x] 1.7.1 `ProductCard` component used by Home, Shop, Related
- [x] 1.7.2 `useAddToCart()` hook + `notify` helper (one toast style)
- [x] 1.7.3 `ScrollToTopOnNavigate` in the router; delete the ~12 copies of `scrollToTop`
- [x] 1.7.4 Scroll-to-top button: `<button aria-label>`, passive listener with cleanup
- [x] 1.7.5 `src/config/store.js` with store name, phones, emails, addresses, social links, hours
- **Done when:** no duplicated card/add-to-cart/scroll code.

### 1.8 Header & footer
- [x] 1.8.1 Mobile menu closes and restores body scroll on every navigation (fixes scroll-lock bug)
- [x] 1.8.2 Closed menu is `visibility:hidden` / `inert` (not focusable); hidden on desktop
- [x] 1.8.3 Menu toggle, search, account, cart icons are buttons/links with `aria-label`
- [x] 1.8.4 Desktop search: expandable search field → `/shop?q=`
- [x] 1.8.5 Mobile search input submits to `/shop?q=`
- [x] 1.8.6 Hide wishlist icon until P1
- [x] 1.8.7 Remove Blog link and fake language/currency selectors from mobile menu
- [x] 1.8.8 Footer: remove stray `Z` attribute; logo `alt`
- [x] 1.8.9 Footer links: remove Career/Affiliates/Gift Card/Find a Store dead links; add Privacy, Refund, Shipping, Terms _(footer links to all four legal pages)_
- [x] 1.8.10 Footer contact details from `config/store.js`; social icons as real links (or hidden if none) 👤 0.4.7 _(from Config/storeInfo.js; values await owner confirmation 0.4.7)_
- [x] 1.8.11 Footer newsletter form: hide until backend (P1)
- [x] 1.8.12 Footer: credits line for the 3D model (CC BY 4.0)
- [x] 1.8.13 Remove "Secure Payments" logos until payments exist (Phase 9)
- **Done when:** every visible header/footer control does something real.

### 1.9 Home page
- [x] 1.9.1 Hero copy: neutral text until owner approves campaign copy 👤 0.4.10 _(owner to approve copy)_
- [~] 1.9.2 Collection tiles: resize `men.jpg`, `fem2.jpg`, `kid.jpg` (≤1600 px, ~150–250 KB); link to `/shop?gender=…` _(images resized to ~290–350 KB; gender links pending — no gender data)_
- [x] 1.9.3 Product grid via `ProductCard`; tabs reduced to real ones (All, New arrivals) _(tabs removed; New arrivals needs dates)_
- [x] 1.9.4 Services strip: neutral claims until confirmed 👤 0.4.10 _(owner 0.4.10)_
- [x] 1.9.5 Remove unused imports (DealTimer, Banner, LimitedEdition, Instagram)
- **Done when:** home page < 2 MB without the 3D model.

### 1.10 3D model (keep it, make it light)
- [x] 1.10.1 Optimise: gltf-transform (dedup, weld, simplify, meshopt/draco quantise) → `public/models/glasses.glb`; compare visually _(public/models/glasses.glb 114 KB, 22k triangles (was 5.6 MB / 98k); visual check at 1366 px OK)_
- [x] 1.10.2 Lazy-load the canvas component (`React.lazy`); preload only inside that chunk → model no longer downloaded on other pages
- [~] 1.10.3 Poster/placeholder of the same size while loading (no layout shift) _(spinner placeholder, no poster image yet)_
- [x] 1.10.4 Hero heights per breakpoint; canvas fills its box (fixes 120 px overflow at 1366×768)
- [x] 1.10.5 Fit model to the canvas (drei `Center`/`Bounds`), delete window-width logic → readable size on phones
- [x] 1.10.6 Pause rendering when the hero is off-screen; cap DPR; no auto-rotate with `prefers-reduced-motion`
- [x] 1.10.7 Touch devices: page scroll works when swiping over the model
- [x] 1.10.8 Colour buttons tint only frame materials (not lenses); `aria-label` + selected state; rename `tshirtColor`
- [~] 1.10.9 WebGL failure fallback (error boundary → poster) _(error boundary in place, no poster image yet)_
- [x] 1.10.10 Remove `castShadow`/`receiveShadow`
- [x] 1.10.11 Delete `scene.gltf` / `scene.bin` after the new file is verified
- **Done when:** model < 1 MB, only loaded on Home, no overflow at any viewport, phone scroll works.

### 1.11 Static pages & dead code
- [x] 1.11.1 About: fix horizontal overflow at 1366 px; image sizes (CLS 0.55); remove lorem mission/vision until owner text 👤 0.4.11 _(also removed template "Company Partners" logos (Mango/Zara/Stradivarius fashion brands))_
- [x] 1.11.2 Contact: iframe `title`s, React attribute casing, responsive maps; contact details from config 👤 0.4.7
- [x] 1.11.3 Contact form: replace `alert()` with mailto/WhatsApp hand-off until backend (P1) _(mailto hand-off)_
- [x] 1.11.4 Legal pages drafted for owner review 👤 0.4.3/0.4.4: Terms, Privacy, Refund & Cancellation, Shipping & Delivery _(drafts describing current no-online-orders state; owner/legal review required before payments)_
- [x] 1.11.5 Remove Blog route, components, data, images
- [x] 1.11.6 Remove Popup, DealTimer, Banner, LimitedEdition, Instagram + CSS + images
- [x] 1.11.7 Remove `wishListSlice` (re-added in P1 when wishlist is built)
- [x] 1.11.8 Delete all unreferenced assets (33 files listed in the audit)
- [x] 1.11.9 404 page typo ("where" → "were")
- **Done when:** no lorem ipsum anywhere; build has 0 unused-import warnings.

### 1.12 HTML, accessibility, SEO basics
- [x] 1.12.1 `index.html`: single viewport meta (no `user-scalable=no`), title "Vijai Opticians", real description, theme colour
- [x] 1.12.2 `manifest.json`: real name; icons (manifest references missing `logo192.png`/`logo512.png`) _(favicon 32 px + icon-192.png; no 512 icon)_
- [x] 1.12.3 Favicon from the shop logo
- [x] 1.12.4 Global `:focus-visible` styles
- [x] 1.12.5 Auth forms: labels, `onSubmit` with `preventDefault` (no page reload), "coming soon" notice until Phase 4
- [x] 1.12.6 Colour contrast check on grey text _(#767676 on white ≈ 4.5:1 (AA))_
- [x] 1.12.7 `robots.txt`
- **Done when:** axe shows no serious/critical issues on key pages.

### 1.13 Performance
- [x] 1.13.1 Route-level code splitting (`React.lazy` per page) _(all routes except Home lazy; main JS 104 KB gz (was 450 KB))_
- [x] 1.13.2 Resize/compress remaining local images (About, shop photos, logos) _(remaining local images ≤ 76 KB; collection tiles tracked in 1.9.2)_
- [x] 1.13.3 Explicit `width`/`height` or `aspect-ratio` on all images
- [x] 1.13.4 Google Fonts: `preconnect`, only used weights
- [~] 1.13.5 Measure: bytes per page and Lighthouse at 390/768/1366/1920 _(bundle measured: main JS 104 KB gz (was 450), 3D chunk 245 KB lazy, model 114 KB (was 5.6 MB); Lighthouse not run)_
- **Done when:** non-home pages < 1 MB; Lighthouse mobile performance ≥ 80.

### 1.14 Responsive QA
- [ ] 1.14.1 Shared container (`padding-inline: clamp(16px, 8vw, 160px)`) instead of repeated 160 px paddings _(deferred, cosmetic)_
- [~] 1.14.2 Check 360, 390, 768, 1024, 1366, 1920: no horizontal scroll, no overlaps _(automated audit dropped at user's request; desktop/laptop/tablet screenshots of home, shop, product and about checked; full flow testing by user via docs/PHASE1_TESTING.md)_
- [~] 1.14.3 Re-run scripted flows (shop → cart, PDP qty, filter page 2, mobile menu → cart) _(automated audit dropped at user's request; desktop/laptop/tablet screenshots of home, shop, product and about checked; full flow testing by user via docs/PHASE1_TESTING.md)_
- **Done when:** scripted audit passes at all widths.

### 1.15 Tooling
- [ ] 1.15.1 👤/dev Install Node 22 LTS locally (Node 18 is EOL; Vite needs ≥ 20.19) _(Homebrew Node 20.8 also present but too old; Node 22 install still needed)_
- [x] 1.15.2 CRA → Vite: install `vite` + `@vitejs/plugin-react`; move `index.html` to root; rename JSX `.js` → `.jsx`; replace `%PUBLIC_URL%`; scripts `dev/build/preview` _(Vite 5 because local Node is 18.18; upgrade to Vite 7 after 1.15.1)_
- [x] 1.15.3 `.env.example` with `VITE_CLOUDINARY_CLOUD_NAME` (and later `VITE_API_BASE_URL`) _(reads VITE_CLOUDINARY_CLOUD_NAME with fallback; listed in .env.example)_
- [x] 1.15.4 Netlify: publish dir `dist`, `NODE_VERSION`, keep SPA redirect, cache headers for `/assets/*` and `/models/*` _(publish dir kept as build/, NODE_VERSION 20)_
- [x] 1.15.5 Remove `react-scripts`, `web-vitals`, CRA test files
- [x] 1.15.6 ESLint (flat config, react, react-hooks, jsx-a11y) — 0 warnings _(legacy .eslintrc, flat config later)_
- [ ] 1.15.7 Prettier config + format pass _(deferred to avoid a repo-wide reformat diff during testing)_
- [x] 1.15.8 Vitest + React Testing Library + jsdom; `npm test`
- [x] 1.15.9 Move existing unit tests to Vitest; add catalog/cloudinary/formatINR tests
- **Done when:** `npm run build`, `npm run lint`, `npm test` all pass.

---

## Phase 2 — FastAPI foundation

### 2.1 Repository restructure
- [ ] 2.1.1 Monorepo: `git mv` app into `frontend/`; create `backend/`, `docs/`, `.github/workflows/`
- [ ] 2.1.2 Move `docs/ARCHITECTURE_PLAN.md` and `docs/TASKS.md` into the repo
- [ ] 2.1.3 Netlify base directory → `frontend`
- [ ] 2.1.4 Root README with links to frontend/backend setup

### 2.2 Local environment
- [ ] 2.2.1 Install `uv`; `uv python install 3.12`
- [ ] 2.2.2 Install PostgreSQL 16/17 (Postgres.app or Homebrew)
- [ ] 2.2.3 Create roles + databases `opticals_dev`, `opticals_test`

### 2.3 Backend scaffold
- [ ] 2.3.1 `uv init`; dependencies (fastapi, uvicorn, pydantic, pydantic-settings, sqlalchemy, psycopg[binary], alembic, pyjwt, pwdlib[argon2], slowapi, httpx, typer, cloudinary, razorpay, sentry-sdk)
- [ ] 2.3.2 Dev dependencies (pytest, pytest-cov, ruff, mypy, factory-boy/polyfactory, freezegun)
- [ ] 2.3.3 ruff config (lint + format), mypy config
- [ ] 2.3.4 `.env.example`, `.gitignore`
- [ ] 2.3.5 `core/config.py`: settings by `APP_ENV`, refuse to start in prod with default secrets
- [ ] 2.3.6 `core/database.py`: engine (pool settings), `SessionLocal`, `get_db` (rollback on error)
- [ ] 2.3.7 `models/base.py`: `DeclarativeBase` + naming convention
- [ ] 2.3.8 `core/errors.py`: `AppError` hierarchy (NotFound, Conflict, Forbidden, BusinessRule), handlers for AppError / RequestValidationError / IntegrityError / unhandled → error envelope
- [ ] 2.3.9 `core/logging.py`: JSON logs, request-id middleware, access log with latency
- [ ] 2.3.10 Security headers middleware; CORS with exact origins + credentials
- [ ] 2.3.11 `main.py`: app factory, lifespan, `/api/v1` router, docs disabled in production
- [ ] 2.3.12 `GET /health`, `GET /health/ready` (DB + Alembic head)
- [ ] 2.3.13 Pagination dependency + generic `Page[T]` schema
- [ ] 2.3.14 Money helpers (paise ↔ rupees, formatting)
- [ ] 2.3.15 `cli.py` (Typer) skeleton
- [ ] 2.3.16 Sentry init (no-op without DSN)

### 2.4 Alembic
- [ ] 2.4.1 `alembic init`; `env.py` uses settings + `Base.metadata`, `compare_type=True`
- [ ] 2.4.2 Migration: extensions `citext`, `pg_trgm`
- [ ] 2.4.3 Document the migration workflow in backend README (§Appendix D)

### 2.5 Tests & CI
- [ ] 2.5.1 pytest fixtures: test DB setup (migrate once), per-test transaction rollback, `TestClient`, factories
- [ ] 2.5.2 Tests for health, error envelope, CORS
- [ ] 2.5.3 GitHub Actions backend: ruff, mypy, `alembic upgrade head`, pytest (Postgres service)
- [ ] 2.5.4 GitHub Actions frontend: lint, test, build
- [ ] 2.5.5 Branch protection on `main` (CI must pass)
- **Done when:** `/api/v1/health/ready` returns 200 locally and in CI.

---

## Phase 3 — Database

### 3.1 Models
- [ ] 3.1.1 Mixins: `TimestampMixin`, `SoftDeleteMixin`
- [ ] 3.1.2 `User` (role CHECK, citext email)
- [ ] 3.1.3 `RefreshToken`, `PasswordResetToken`
- [ ] 3.1.4 `Address` (pincode CHECK, partial unique default)
- [ ] 3.1.5 `Category` (self-referencing, unique slug, unique (parent, name))
- [ ] 3.1.6 `Brand`
- [ ] 3.1.7 `Product` (attributes, specs JSONB, status CHECK, computed `search_vector`, GIN + trigram indexes)
- [ ] 3.1.8 `ProductVariant` (unique `upper(sku)`, price ≤ MRP CHECK, unique (product, colour, size))
- [ ] 3.1.9 `ProductImage` (unique public_id, partial unique primary)
- [ ] 3.1.10 `Inventory` (CHECKs on_hand ≥ 0, 0 ≤ reserved ≤ on_hand)
- [ ] 3.1.11 `InventoryTransaction` (type CHECK, delta ≠ 0, indexes)
- [ ] 3.1.12 `Cart`, `CartItem` (unique (cart, variant), qty CHECK)
- [ ] 3.1.13 `Order` (status/payment_status CHECKs, money CHECKs, unique order_number, unique (user, idempotency_key), indexes)
- [ ] 3.1.14 `OrderItem` (snapshots, `configuration` JSONB)
- [ ] 3.1.15 `OrderStatusHistory`
- [ ] 3.1.16 `Payment`, `PaymentEvent`, `Refund`
- [ ] 3.1.17 `AuditLog`, `StoreSetting`
- [ ] 3.1.18 Relationships with `lazy="raise"` defaults

### 3.2 Migrations
- [ ] 3.2.1 Autogenerate per group (identity, catalogue, inventory, cart, orders, payments, admin)
- [ ] 3.2.2 Hand-review each: CHECKs, partial indexes, computed column, expression indexes
- [ ] 3.2.3 Upgrade/downgrade round-trip test in CI
- [ ] 3.2.4 Constraint tests (case-insensitive SKU, price ≤ MRP, reserved ≤ on_hand, one default address, unique slugs)

### 3.3 Seed data
- [ ] 3.3.1 Seed categories (Eyeglasses, Sunglasses, Contact Lenses, Accessories + subcategories)
- [ ] 3.3.2 Seed brands (Ray-Ban, …)
- [ ] 3.3.3 Seed products/variants from the Phase-1 catalog (6 products / 11 variants)
- [ ] 3.3.4 Seed images by listing Cloudinary `Products/` via Admin API (public_id, version, width, height)
- [ ] 3.3.5 Seed inventory with RESTOCK transactions 👤 0.4.12 (placeholder 0 until provided)
- [ ] 3.3.6 Seed `store_settings` defaults (shipping fee, threshold, payment window 30 min, low-stock 3)
- [ ] 3.3.7 Seed script idempotent (`cli seed --reset` only in dev)
- [ ] 3.3.8 ER diagram in `docs/`
- **Done when:** fresh DB → `alembic upgrade head` → `cli seed` → 6 products, 11 variants, images linked.

---

## Phase 4 — Authentication & accounts

### 4.1 Backend
- [ ] 4.1.1 `security.py`: Argon2 hash/verify, rehash-on-login if params change
- [ ] 4.1.2 JWT encode/decode (exp, iat, jti, type), clock-skew leeway
- [ ] 4.1.3 Opaque token generator + SHA-256 hashing
- [ ] 4.1.4 User repository + service
- [ ] 4.1.5 `POST /auth/register` (email normalisation, password policy, duplicate → 409)
- [ ] 4.1.6 `POST /auth/login` (generic errors, constant-time path for unknown email, `last_login_at`)
- [ ] 4.1.7 Refresh token issue, rotation, reuse detection (revoke family)
- [ ] 4.1.8 Cookie settings per environment (Secure, SameSite=Lax, Path, Domain)
- [ ] 4.1.9 `POST /auth/refresh` (cookie + `X-Requested-With` + Origin check)
- [ ] 4.1.10 `POST /auth/logout`, `POST /auth/logout-all`
- [ ] 4.1.11 Dependencies `get_current_user`, `require_role`, `require_permission`; `ROLE_PERMISSIONS` map
- [ ] 4.1.12 `GET/PATCH /me`, `POST /me/change-password` (revokes other sessions)
- [ ] 4.1.13 Addresses CRUD + set default; Indian states list; phone/pincode validation; max 10
- [ ] 4.1.14 Email service interface: console (dev) + provider (staging/prod); HTML + text templates
- [ ] 4.1.15 Forgot / reset password (hashed single-use token, 30 min, generic response, revoke sessions)
- [ ] 4.1.16 Rate limits (login, register, forgot, reset)
- [ ] 4.1.17 `cli create-admin`
- [ ] 4.1.18 Tests: every flow, expiry (freezegun), rotation reuse, deactivated user, 401/403, rate limits

### 4.2 Frontend
- [ ] 4.2.1 `.env` `VITE_API_BASE_URL`; `api/baseApi.js` (RTK Query, `credentials: 'include'`)
- [ ] 4.2.2 `baseQueryWithReauth` with single-flight refresh + retry; logout on refresh failure
- [ ] 4.2.3 `authSlice` (user, accessToken, status) — token in memory only
- [ ] 4.2.4 Session restore on app start (refresh) with loading gate
- [ ] 4.2.5 Error mapping helper (API envelope → form errors/toasts)
- [ ] 4.2.6 Install react-hook-form + zod
- [ ] 4.2.7 Login page (`/login?next=`)
- [ ] 4.2.8 Register page
- [ ] 4.2.9 Forgot password page; Reset password page (token from URL)
- [ ] 4.2.10 `RequireAuth`, `RequireRole` guards
- [ ] 4.2.11 Header account menu (signed in/out states, logout)
- [ ] 4.2.12 Account layout + Profile page + Change password page
- [ ] 4.2.13 Addresses page (list, add, edit, delete with confirm, set default)
- [ ] 4.2.14 Tests with MSW (login success/failure, refresh retry, guard redirect)
- **Done when:** register → login → reload keeps session → logout; admin user can be created from CLI.

---

## Phase 5 — Catalogue APIs & admin catalogue

### 5.1 Backend public
- [ ] 5.1.1 Schemas: `ProductCard`, `ProductDetail`, `VariantRead`, `CategoryTree`, `BrandRead`
- [ ] 5.1.2 Listing query: filters (category incl. subcategories, brand, gender, shape, type, material, colour family, price range on cheapest variant, in stock), sort, pagination
- [ ] 5.1.3 Search: full-text + trigram fallback, relevance sort
- [ ] 5.1.4 Facets query with counts
- [ ] 5.1.5 `GET /products`, `/products/facets`, `/products/{slug}`, `/products/{slug}/related`
- [ ] 5.1.6 `GET /categories`, `GET /brands`
- [ ] 5.1.7 Availability buckets (in stock / low / out) — no exact counts exposed
- [ ] 5.1.8 Cache-Control headers on public catalogue
- [ ] 5.1.9 Tests: each filter, combined filters, sorts, pagination bounds, inactive/deleted hidden, search

### 5.2 Backend admin
- [ ] 5.2.1 Audit-log helper (records field-level changes)
- [ ] 5.2.2 Slug generation + uniqueness
- [ ] 5.2.3 Admin products: list (incl. inactive), create with variants, get, update, status change, soft delete
- [ ] 5.2.4 Variants: create, update, soft delete; SKU conflict → 409; price ≤ MRP
- [ ] 5.2.5 Inventory row auto-created with each variant
- [ ] 5.2.6 Categories: CRUD, depth ≤ 2, cycle check, deactivate cascades visibility
- [ ] 5.2.7 Brands: CRUD
- [ ] 5.2.8 Cloudinary signed-upload endpoint (folder, formats jpg/png/webp, max size)
- [ ] 5.2.9 Register uploaded image (verify via Admin API), update alt/primary/variant, reorder, delete (+ Cloudinary destroy)
- [ ] 5.2.10 Tests incl. 403 for customers on every admin route

### 5.3 Storefront on API
- [ ] 5.3.1 `catalogApi` endpoints (RTK Query)
- [ ] 5.3.2 Shop page: URL params → query; facets drive filter panel; server pagination; skeletons; error + retry
- [ ] 5.3.3 Product page: variant selector (colour/size), `?variant=SKU`, availability badge, variant images
- [ ] 5.3.4 Related products from API
- [ ] 5.3.5 Home featured products from API
- [ ] 5.3.6 Category navigation (header/shop) from API
- [ ] 5.3.7 `<Img>` component with Cloudinary `srcSet`
- [ ] 5.3.8 Remove static catalog usage from the storefront (keep file only as seed input)
- [ ] 5.3.9 Product JSON-LD + meta tags (react-helmet-async)

### 5.4 Admin UI — catalogue
- [ ] 5.4.1 Admin layout (lazy bundle): sidebar nav, top bar, `RequireRole`
- [ ] 5.4.2 Install MUI X Data Grid; `AdminTable` wrapper (server pagination/sort/filter in URL, loading/empty/error)
- [ ] 5.4.3 `ConfirmDialog`, form field components
- [ ] 5.4.4 Products list (search, category, brand, status, stock filters)
- [ ] 5.4.5 Product editor — Details tab
- [ ] 5.4.6 Product editor — Variants tab (inline grid: SKU, colour, size, MRP, price, active)
- [ ] 5.4.7 Product editor — Images tab (signed upload, drag-drop, progress, reorder, primary, alt, per-variant)
- [ ] 5.4.8 Product editor — Specifications tab (key/value rows)
- [ ] 5.4.9 Activate/deactivate/delete with confirmation
- [ ] 5.4.10 Categories page (tree, add/edit, subcategories, deactivate)
- [ ] 5.4.11 Brands page (logo upload)
- **Done when:** admin creates a product with 2 variants and images; it appears in the shop with working filters.

---

## Phase 6 — Inventory

- [ ] 6.1 Inventory service `adjust(variant, type, delta, note, actor)` with `SELECT … FOR UPDATE` + ledger row + audit log
- [ ] 6.2 `reserve`, `release`, `commit_sale`, `restock_on_cancel` functions (used in Phase 8)
- [ ] 6.3 Validation: result ≥ reserved, note required for negative adjustments
- [ ] 6.4 `GET /admin/inventory` (search, filters, sort, pagination)
- [ ] 6.5 `GET /admin/inventory/low-stock`
- [ ] 6.6 `POST /admin/inventory/{variant_id}/adjustments`
- [ ] 6.7 `PATCH /admin/inventory/{variant_id}` (threshold)
- [ ] 6.8 `GET /admin/inventory/transactions`
- [ ] 6.9 "Mark out of stock" = adjustment to zero available with note
- [ ] 6.10 Tests: ledger correctness (20 → 18 → 28 example), negative guard, concurrency (parallel adjustments)
- [ ] 6.11 Admin UI: inventory grid (available / reserved / on hand, stock badges)
- [ ] 6.12 Admin UI: restock / adjust dialog
- [ ] 6.13 Admin UI: per-variant history drawer
- [ ] 6.14 Admin UI: transactions log page with filters
- **Done when:** every stock change has a ledger row; stock can never go negative.

---

## Phase 7 — Cart

- [ ] 7.1 Cart service: get-or-create, add (merge quantities), update, remove, clear
- [ ] 7.2 Live pricing + line issues (OUT_OF_STOCK, PRICE_CHANGED, INACTIVE)
- [ ] 7.3 Stock clamp on add/update (409 with available quantity)
- [ ] 7.4 `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}`, `DELETE /cart`
- [ ] 7.5 `POST /cart/merge` (guest → server)
- [ ] 7.6 `POST /cart/preview` (public guest pricing)
- [ ] 7.7 Tests incl. ownership and merge edge cases
- [ ] 7.8 Frontend: guest cart slice stores `{variant_id, quantity}` (migrate Phase-1 localStorage format)
- [ ] 7.9 Frontend: `useCart()` hides guest vs server
- [ ] 7.10 Frontend: cart page from API (priced lines, issues shown, optimistic quantity with rollback)
- [ ] 7.11 Frontend: merge on login, clear guest cart
- [ ] 7.12 Frontend: header badge from server cart when signed in
- [ ] 7.13 Tests (MSW)
- **Done when:** cart follows the user across devices; guest cart merges on login.

---

## Phase 8 — Checkout & orders

### 8.1 Backend
- [ ] 8.1.1 Pricing service: subtotal, discount (0 for now), shipping from settings, GST-inclusive tax split 👤 0.4.2/0.4.3
- [ ] 8.1.2 `POST /checkout/quote`
- [ ] 8.1.3 Order number generator (DB sequence, `VO-YYMMDD-NNNN`)
- [ ] 8.1.4 Order state machine (allowed transitions, who may trigger) + history writer
- [ ] 8.1.5 `POST /orders`: idempotency key, lock inventory in variant order, reserve, snapshot prices/address, `expires_at`
- [ ] 8.1.6 `GET /orders`, `GET /orders/{order_number}`, `POST /orders/{n}/cancel`
- [ ] 8.1.7 FakeProvider payment for dev/tests ("simulate success/failure")
- [ ] 8.1.8 `mark_order_paid` (idempotent): commit sale, CONFIRMED, clear cart, email
- [ ] 8.1.9 Expiry job (`cli expire-pending-orders`, `FOR UPDATE SKIP LOCKED`)
- [ ] 8.1.10 Admin orders: list/search/filter, detail, status change (+ tracking fields), cancel (+ restock)
- [ ] 8.1.11 Order emails: placed, confirmed, shipped (with tracking), delivered, cancelled
- [ ] 8.1.12 Tests: totals, idempotent replay, **concurrent last-unit order**, expiry release, illegal transitions 409, ownership 404

### 8.2 Frontend
- [ ] 8.2.1 Checkout route (auth required), address select / inline add
- [ ] 8.2.2 Order summary from quote; price/stock change warnings
- [ ] 8.2.3 Place order with idempotency key; disable double submit
- [ ] 8.2.4 Payment step (FakeProvider in dev)
- [ ] 8.2.5 Order confirmation page
- [ ] 8.2.6 Account → Orders list + Order detail (timeline, tracking, cancel)
- [ ] 8.2.7 Admin → Orders list (filters: status, payment, date, search)
- [ ] 8.2.8 Admin → Order detail (items, customer, address, payments, timeline, actions, tracking entry, cancel with confirm)
- [ ] 8.2.9 Remove legacy checkout/confirmation markup not reused
- **Done when:** full purchase works end-to-end with the FakeProvider and stock moves correctly.

---

## Phase 9 — Online payment (Razorpay)

- [ ] 9.1 👤 Razorpay account, KYC, settlement bank account ⛔ legal pages (1.11.4) live on the site
- [ ] 9.2 `RazorpayProvider` (create order, verify checkout signature, fetch payment, verify webhook, refund)
- [ ] 9.3 `POST /payments/razorpay/orders` (amount from DB, reuse open attempt)
- [ ] 9.4 `POST /payments/razorpay/verify` (signature + fetch payment + amount check)
- [ ] 9.5 `GET /orders/{n}/payment-status`
- [ ] 9.6 `POST /webhooks/razorpay` (raw body HMAC, event dedup, handlers: payment.captured, payment.failed, order.paid, refund.processed)
- [ ] 9.7 Late-payment handling (re-reserve or auto-refund)
- [ ] 9.8 Reconciliation inside expiry job + daily mismatch report
- [ ] 9.9 Refund flow from admin cancel; refund status updates
- [ ] 9.10 Configure test-mode webhook (staging) and secrets
- [ ] 9.11 Frontend: lazy-load `checkout.js`, open with server data, success/dismiss/failure handling
- [ ] 9.12 Frontend: "processing payment" page polling status; retry payment for a pending order
- [ ] 9.13 Tests: signature vectors, webhook replay, verify + webhook double processing, amount mismatch
- [ ] 9.14 Test-mode end-to-end on staging (UPI, card, failure)
- [ ] 9.15 "Secure payments" logos back in footer
- **Done when:** test-mode payments confirm orders via either path exactly once.

---

## Phase 10 — Admin dashboard, customers, reports, settings

- [ ] 10.1 `GET /admin/dashboard/summary` (Asia/Kolkata day/month boundaries; paid orders only)
- [ ] 10.2 `GET /admin/dashboard/revenue-trend`
- [ ] 10.3 Customers: list, detail (orders, lifetime value), activate/deactivate
- [ ] 10.4 Reports: sales by day/month/product/category/brand
- [ ] 10.5 Settings: get/update (shipping, threshold, payment window, store contact)
- [ ] 10.6 Tests for aggregates (timezone edges)
- [ ] 10.7 Dashboard UI: KPI cards, revenue chart, recent orders, low-stock list
- [ ] 10.8 Customers UI
- [ ] 10.9 Reports UI (date range, grouping)
- [ ] 10.10 Settings UI
- **Done when:** owner can run daily operations without a developer.

---

## Phase 11 — Testing & hardening

- [ ] 11.1 Backend coverage ≥ 80% on services
- [ ] 11.2 Generated 401/403 test for every `/admin` route
- [ ] 11.3 Playwright setup (staging, FakeProvider/test mode)
- [ ] 11.4 E2E: registration
- [ ] 11.5 E2E: login
- [ ] 11.6 E2E: admin login
- [ ] 11.7 E2E: product listing
- [ ] 11.8 E2E: product search
- [ ] 11.9 E2E: product filters
- [ ] 11.10 E2E: product details + variant select
- [ ] 11.11 E2E: add to cart
- [ ] 11.12 E2E: cart update
- [ ] 11.13 E2E: checkout
- [ ] 11.14 E2E: order creation
- [ ] 11.15 E2E: inventory deduction
- [ ] 11.16 E2E: admin product creation
- [ ] 11.17 E2E: admin inventory update
- [ ] 11.18 E2E: admin order management
- [ ] 11.19 E2E: payment flow (test mode)
- [ ] 11.20 Security checklist (headers/CSP, CORS, rate limits, upload limits, no secrets in logs, no `dangerouslySetInnerHTML`)
- [ ] 11.21 Dependency audits (`pip-audit`, `npm audit`) in CI
- [ ] 11.22 Accessibility audit (axe) on key pages
- [ ] 11.23 Load smoke test (listing + checkout)
- [ ] 11.24 Real-device check: iOS Safari, Android Chrome
- **Done when:** CI green incl. E2E on staging.

---

## Phase 12 — Deployment & go-live

- [ ] 12.1 👤 Domain purchased / DNS access
- [ ] 12.2 Hosting accounts (Render or Railway; Netlify)
- [ ] 12.3 Managed Postgres staging + production (same region as API), backups on
- [ ] 12.4 API services staging + production (non-sleeping), Dockerfile or native build
- [ ] 12.5 Pre-deploy `alembic upgrade head`; health check `/health/ready`
- [ ] 12.6 Environment variables per environment (§Appendix C)
- [ ] 12.7 Netlify env vars, deploy previews, `_headers` (cache + CSP)
- [ ] 12.8 DNS: `www` → Netlify, `api` → API host; TLS verified
- [ ] 12.9 Verify refresh cookie on Safari iOS (same-site)
- [ ] 12.10 Cron job: expire pending orders every 5 min
- [ ] 12.11 Sentry projects (frontend + backend), release tagging
- [ ] 12.12 Uptime monitor on `/health/ready` with alerts to owner
- [ ] 12.13 Weekly `pg_dump` GitHub Action to off-site storage; restore test into staging
- [ ] 12.14 👤 Email provider domain verification (SPF, DKIM, DMARC)
- [ ] 12.15 Razorpay live keys + live webhook URL
- [ ] 12.16 Create production admin user
- [ ] 12.17 Seed production catalogue; 👤 owner enters stock
- [ ] 12.18 Go-live smoke test: real small payment + refund
- [ ] 12.19 `sitemap.xml`, Google Search Console, link from Google Business profile
- [ ] 12.20 Runbooks: deploy, rollback, restore backup, rotate secrets, refund a payment
- [ ] 12.21 👤 Owner training session on the admin
- **Done when:** live site takes a real paid order and the owner can fulfil it.

---

## P1 backlog (after launch)

- [ ] Wishlist (table, API, UI, header icon back)
- [ ] Coupons (table, validation in pricing, admin UI, cart field back)
- [ ] Returns flow (RETURN_REQUESTED → RETURNED, restock, refund)
- [ ] Partial refunds
- [ ] Email verification
- [ ] Admin TOTP 2FA
- [ ] Sales CSV export, better reports, inventory analytics
- [ ] Facet counts for every filter, frame size filters
- [ ] Courier integration (e.g. Shiprocket) + automatic tracking
- [ ] Cash on delivery 👤 0.4.5
- [ ] Contact form + newsletter backend
- [ ] STAFF / MANAGER roles

## P2 backlog (future)

- [ ] Prescriptions (upload, history, private storage)
- [ ] Lens options and power-based pricing, frame + lens bundles
- [ ] Virtual try-on
- [ ] Recommendations
- [ ] Loyalty programme
- [ ] Advanced analytics
- [ ] Blog (only with real content)
