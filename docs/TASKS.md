# Vijai Opticians — End-to-End Task Breakdown

Companion to [ARCHITECTURE_PLAN.md](ARCHITECTURE_PLAN.md). Section references like "§K" point there.

**Legend**
- `[ ]` to do · `[x]` done · `[~]` in progress
- 👤 needs the shop owner (information, decision, account, document)
- ⛔ blocked until the listed task is done
- Each group ends with **Done when** = acceptance criteria for the group.

## Progress

Last updated: 2026-10-05 22:53

_Status: Phase 8 done (2c7f40a, c0fcf06): checkout with UPI-to-shop or pay at store, orders, admin orders + settings. Backend 214 tests, frontend 35, browser run 39/39. Paused for user testing (docs/PHASE8_TESTING.md)._

| Phase | Done | In progress | Total | % done |
|---|---:|---:|---:|---:|
| Phase 0 | 3 | 2 | 18 | 17% |
| Phase 1 | 120 | 7 | 130 | 92% |
| Phase 2 | 26 | 4 | 31 | 84% |
| Phase 3 | 28 | 2 | 30 | 93% |
| Phase 4 | 32 | 0 | 32 | 100% |
| Phase 5 | 37 | 2 | 39 | 95% |
| Phase 6 | 14 | 0 | 14 | 100% |
| Phase 7 | 13 | 0 | 13 | 100% |
| Phase 8 | 21 | 0 | 21 | 100% |
| Phase 9 | 0 | 0 | 15 | 0% |
| Phase 10 | 0 | 2 | 10 | 0% |
| Phase 11 | 0 | 0 | 24 | 0% |
| Phase 12 | 0 | 2 | 21 | 0% |
| P1 | 0 | 0 | 12 | 0% |
| P2 | 0 | 0 | 7 | 0% |
| **All** | **294** | **21** | **417** | **71%** |

**Recently completed**
- 8.x Checkout & orders: UPI to shop's ID / pay at store, stock holds + expiry, admin order workflow, settings
- Cloudinary uploads live: real upload/display/delete verified
- Photos: square crop before upload, white photo boxes on all storefront images, owner guide docs/ADDING_PHOTOS.md
- 7.1–7.13 Server cart: live pricing, stock checks, guest merge, cart page issues + one-click fixes
- Cart lines are now SKUs (snapshot until Phase 7 server pricing)
- 6.1–6.14 Inventory: locked ledger, admin stock grid, adjust dialog, history, transactions log
- 5.4.x Admin catalogue UI: products, editor tabs, categories, brands
- 5.3.x Storefront on the API: shop, product page, related, home, CloudImage, JSON-LD
- 5.2.x Admin catalogue API + Cloudinary signed uploads (keys pending)
- 5.1.x Public catalogue API: filters, search, facets, availability, caching

**Up next**
- 👤 User testing of Phase 8 (docs/PHASE8_TESTING.md)
- 👤 Enter the owner's UPI ID in Admin → Settings
- Phase 9 Razorpay (when the owner's account is approved) or Phase 10 Dashboard & reports
- 👤 Open PRs; 2.5.5 enable branch protection
- 👤 12.2 Owner accounts (GitHub transfer, Vercel Pro, Neon)
- 👤 Rotate Cloudinary secret before go-live (it was shared in chat)

---

Work top to bottom inside a phase unless a dependency says otherwise.

---

## Phase 0 — Audit & decisions

- [x] 0.1 Audit existing codebase (code read, build, headless Chrome at 4 viewports, Cloudinary probe)
- [x] 0.2 Write architecture plan (`docs/ARCHITECTURE_PLAN.md`)
- [x] 0.3 Write this task breakdown
- [ ] 0.4 👤 Owner answers (feed results back into the plan): _(2026-10-05: payment for now = UPI to the shop's own UPI ID or pay at store; UPI ID still a placeholder until the owner's ID is entered in Admin → Settings)_
  - [ ] 0.4.1 Online stock: separate pool or shared with the two shops? Who updates it?
  - [~] 0.4.2 Shipping: fee, free-shipping threshold (site claims ₹15,000), delivery regions, courier _(2026-10-05: delivery is free; regions/courier still open)_
  - [~] 0.4.3 GST: GSTIN, legal entity name, HSN codes and rates per category (confirm with CA), invoice needs _(2026-10-05: prices include GST; GSTIN, entity name, HSN codes still open)_
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
  - [ ] 0.4.x 👤 Is Cloudinary cloud dyf8dp9oo the owner's account? If not, create one on vachanvijai@gmail.com and move images

---

## Phase 1 — Frontend cleanup (existing React app, static data)

> ✅ Phase 8 done (2c7f40a, c0fcf06): checkout with UPI-to-shop or pay at store, orders, admin orders + settings. Backend 214 tests, frontend 35, browser run 39/39. Paused for user testing (docs/PHASE8_TESTING.md).

> ✅ Phase 7 done (600a5e0): server cart, live pricing, stock issues, guest merge on sign-in. Backend 194 tests, frontend 32, browser run 22/22. Paused for user testing (docs/PHASE7_TESTING.md).

> ✅ Phase 7 done (600a5e0): server cart, live pricing, stock issues, guest merge on sign-in. Backend 194 tests, frontend 32, browser run 22/22. Paused for user testing (docs/PHASE7_TESTING.md).

> ✅ Phase 7 done (600a5e0): server cart, live pricing, stock issues, guest merge on sign-in. Backend 194 tests, frontend 32, browser run 22/22. Paused for user testing (docs/PHASE7_TESTING.md).

> ✅ Phases 5–6 done on phase2/backend-foundation (c7a76b1): catalogue + admin + stock. Backend 175 tests, frontend 29, browser runs storefront 14/14 and admin 16/16. Paused for user testing (docs/PHASE5_6_TESTING.md).

> ✅ Phase 4 (accounts) done on phase2/backend-foundation (6c13491): backend 115 tests, frontend 40 tests, browser e2e 15/15. Paused for user testing (docs/PHASE4_TESTING.md).

> ✅ Phase 3 (database) done on phase2/backend-foundation (8698019): 21 tables, 7 migrations, seed, 70 backend tests. Deployment switched to Vercel under the owner's account (docs/DEPLOYMENT.md). Next: Phase 4 auth.

> ✅ Phase 1 committed + pushed (b261f78). Phase 2 foundation done on branch phase2/backend-foundation: 44 backend tests, ruff + mypy clean. Waiting on user: open PRs (no gh CLI), enable branch protection.

> ✅ Phase 1 committed + pushed (b261f78). Phase 2 foundation done on branch phase2/backend-foundation: 44 backend tests, ruff + mypy clean. Waiting on user: open PRs (no gh CLI), enable branch protection.



> ✅ Vite build passes (0 warnings), `npm test` 32/32, `npm run lint` 0 warnings. Final headless audit running.



### 1.1 Repository hygiene
- [x] 1.1.1 Commit the uncommitted Shop / Filter / Product changes and untracked `src/Utils/` (commit `82f6f0d` on new branch `phase1/frontend-cleanup` from `main`; `Headerchanges` was already merged via PR #1)
- [x] 1.1.2 Push `phase1/frontend-cleanup` to `origin`
- [x] 1.1.3 Remove `allfiles.txt` (git ls-tree dump)
- [x] 1.1.4 Remove unused `public/shirt_baked_2.glb`
- [x] 1.1.5 Extend `.gitignore` (`build/`, `dist/`, `coverage/`, `.env.*` except `.env.example`, editor folders)
- [x] 1.1.6 Rename package `uomo` → `vijai-opticians-web`
- [x] 1.1.7 Rewrite `README.md` (what it is, setup, scripts, structure, link to docs) _(updated for Vite)_
- [~] 1.1.8 Open PR `phase1/frontend-cleanup` → `main` at the end of Phase 1 and merge _(committed b261f78 and pushed; PR to open via GitHub link (gh CLI not installed))_
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
- [x] 1.15.4 Netlify: publish dir `dist`, `NODE_VERSION`, keep SPA redirect, cache headers for `/assets/*` and `/models/*` _(publish dir kept as build/, NODE_VERSION 20; superseded: Netlify replaced by Vercel (netlify.toml removed))_
- [x] 1.15.5 Remove `react-scripts`, `web-vitals`, CRA test files
- [x] 1.15.6 ESLint (flat config, react, react-hooks, jsx-a11y) — 0 warnings _(legacy .eslintrc, flat config later)_
- [ ] 1.15.7 Prettier config + format pass _(deferred to avoid a repo-wide reformat diff during testing)_
- [x] 1.15.8 Vitest + React Testing Library + jsdom; `npm test`
- [x] 1.15.9 Move existing unit tests to Vitest; add catalog/cloudinary/formatINR tests
- **Done when:** `npm run build`, `npm run lint`, `npm test` all pass.

---

## Phase 2 — FastAPI foundation

### 2.1 Repository restructure
- [x] 2.1.1 Monorepo: `git mv` app into `frontend/`; create `backend/`, `docs/`, `.github/workflows/` _(frontend/ via git mv, backend/, docs/, .github/workflows/)_
- [x] 2.1.2 Move `docs/ARCHITECTURE_PLAN.md` and `docs/TASKS.md` into the repo
- [x] 2.1.3 Netlify base directory → `frontend` _(netlify.toml base = "frontend"; superseded: Netlify replaced by Vercel (netlify.toml removed))_
- [x] 2.1.4 Root README with links to frontend/backend setup

### 2.2 Local environment
- [x] 2.2.1 Install `uv`; `uv python install 3.12` _(uv 0.12.23, Python 3.12.15 in ~/.local)_
- [x] 2.2.2 Install PostgreSQL 16/17 (Postgres.app or Homebrew) _(Postgres.app, PostgreSQL 18.6)_
- [x] 2.2.3 Create roles + databases `opticals_dev`, `opticals_test` _(role opticals, password auth via pg_hba scram rule; opticals_dev, opticals_test)_

### 2.3 Backend scaffold
- [~] 2.3.1 `uv init`; dependencies (fastapi, uvicorn, pydantic, pydantic-settings, sqlalchemy, psycopg[binary], alembic, pyjwt, pwdlib[argon2], slowapi, httpx, typer, cloudinary, razorpay, sentry-sdk) _(installed what Phase 2 uses (fastapi, uvicorn, pydantic-settings, sqlalchemy, psycopg, alembic, typer, sentry-sdk); pyjwt/pwdlib/slowapi in Phase 3, cloudinary/razorpay in their phases)_
- [~] 2.3.2 Dev dependencies (pytest, pytest-cov, ruff, mypy, factory-boy/polyfactory, freezegun) _(pytest, pytest-cov, httpx2, ruff, mypy; factory-boy/freezegun added when models need them)_
- [x] 2.3.3 ruff config (lint + format), mypy config
- [x] 2.3.4 `.env.example`, `.gitignore`
- [x] 2.3.5 `core/config.py`: settings by `APP_ENV`, refuse to start in prod with default secrets
- [x] 2.3.6 `core/database.py`: engine (pool settings), `SessionLocal`, `get_db` (rollback on error)
- [x] 2.3.7 `models/base.py`: `DeclarativeBase` + naming convention
- [x] 2.3.8 `core/errors.py`: `AppError` hierarchy (NotFound, Conflict, Forbidden, BusinessRule), handlers for AppError / RequestValidationError / IntegrityError / unhandled → error envelope
- [x] 2.3.9 `core/logging.py`: JSON logs, request-id middleware, access log with latency
- [x] 2.3.10 Security headers middleware; CORS with exact origins + credentials _(security headers + CORS exact origins with credentials; HSTS/CSP in production only)_
- [x] 2.3.11 `main.py`: app factory, lifespan, `/api/v1` router, docs disabled in production
- [x] 2.3.12 `GET /health`, `GET /health/ready` (DB + Alembic head)
- [x] 2.3.13 Pagination dependency + generic `Page[T]` schema
- [x] 2.3.14 Money helpers (paise ↔ rupees, formatting)
- [x] 2.3.15 `cli.py` (Typer) skeleton
- [x] 2.3.16 Sentry init (no-op without DSN)

### 2.4 Alembic
- [x] 2.4.1 `alembic init`; `env.py` uses settings + `Base.metadata`, `compare_type=True`
- [x] 2.4.2 Migration: extensions `citext`, `pg_trgm` _(migration 5c04a4daf21d; upgrade/downgrade/upgrade verified)_
- [x] 2.4.3 Document the migration workflow in backend README (§Appendix D) _(backend/README.md)_

### 2.5 Tests & CI
- [x] 2.5.1 pytest fixtures: test DB setup (migrate once), per-test transaction rollback, `TestClient`, factories
- [x] 2.5.2 Tests for health, error envelope, CORS _(44 tests: health, readiness 503 paths, error envelope, integrity 409, 500 hiding details, CORS, security headers, config guards, money, pagination)_
- [~] 2.5.3 GitHub Actions backend: ruff, mypy, `alembic upgrade head`, pytest (Postgres service) _(workflows written; first run happens when the branch is pushed)_
- [~] 2.5.4 GitHub Actions frontend: lint, test, build _(workflows written; first run happens when the branch is pushed)_
- [ ] 2.5.5 Branch protection on `main` (CI must pass) _(👤 user: GitHub → Settings → Branches)_
- **Done when:** `/api/v1/health/ready` returns 200 locally and in CI.

---

## Phase 3 — Database

### 3.1 Models
- [x] 3.1.1 Mixins: `TimestampMixin`, `SoftDeleteMixin` _(TimestampMixin, CreatedAtMixin, SoftDeleteMixin)_
- [x] 3.1.2 `User` (role CHECK, citext email)
- [x] 3.1.3 `RefreshToken`, `PasswordResetToken`
- [x] 3.1.4 `Address` (pincode CHECK, partial unique default)
- [x] 3.1.5 `Category` (self-referencing, unique slug, unique (parent, name))
- [x] 3.1.6 `Brand`
- [x] 3.1.7 `Product` (attributes, specs JSONB, status CHECK, computed `search_vector`, GIN + trigram indexes)
- [x] 3.1.8 `ProductVariant` (unique `upper(sku)`, price ≤ MRP CHECK, unique (product, colour, size))
- [x] 3.1.9 `ProductImage` (unique public_id, partial unique primary)
- [x] 3.1.10 `Inventory` (CHECKs on_hand ≥ 0, 0 ≤ reserved ≤ on_hand)
- [x] 3.1.11 `InventoryTransaction` (type CHECK, delta ≠ 0, indexes)
- [x] 3.1.12 `Cart`, `CartItem` (unique (cart, variant), qty CHECK)
- [x] 3.1.13 `Order` (status/payment_status CHECKs, money CHECKs, unique order_number, unique (user, idempotency_key), indexes)
- [x] 3.1.14 `OrderItem` (snapshots, `configuration` JSONB)
- [x] 3.1.15 `OrderStatusHistory`
- [x] 3.1.16 `Payment`, `PaymentEvent`, `Refund`
- [x] 3.1.17 `AuditLog`, `StoreSetting`
- [x] 3.1.18 Relationships with `lazy="raise"` defaults

### 3.2 Migrations
- [x] 3.2.1 Autogenerate per group (identity, catalogue, inventory, cart, orders, payments, admin) _(7 migrations: identity, catalogue, cart, orders, inventory, payments, admin)_
- [x] 3.2.2 Hand-review each: CHECKs, partial indexes, computed column, expression indexes _(enum CHECKs named ck_<table>_<column>, partial/expression/trigram indexes, computed search_vector reviewed)_
- [x] 3.2.3 Upgrade/downgrade round-trip test in CI _(CI upgrade → downgrade base → upgrade; plus test that models match migrations)_
- [x] 3.2.4 Constraint tests (case-insensitive SKU, price ≤ MRP, reserved ≤ on_hand, one default address, unique slugs) _(23 constraint tests)_

### 3.3 Seed data
- [x] 3.3.1 Seed categories (Eyeglasses, Sunglasses, Contact Lenses, Accessories + subcategories)
- [x] 3.3.2 Seed brands (Ray-Ban, …)
- [x] 3.3.3 Seed products/variants from the Phase-1 catalog (6 products / 11 variants) _(7 models / 11 variants (task said 6 products; the catalogue has 7 frame models))_
- [~] 3.3.4 Seed images by listing Cloudinary `Products/` via Admin API (public_id, version, width, height) _(images seeded from the known Products/{id}/{id}_{n} pattern (64); width/height via Cloudinary Admin API needs owner's API key)_
- [~] 3.3.5 Seed inventory with RESTOCK transactions 👤 0.4.12 (placeholder 0 until provided) _(inventory rows created at 0; RESTOCK entries when owner provides counts (0.4.12))_
- [x] 3.3.6 Seed `store_settings` defaults (shipping fee, threshold, payment window 30 min, low-stock 3) _(shipping fee 0 / threshold null placeholders pending owner, payment window 30, low stock 3)_
- [x] 3.3.7 Seed script idempotent (`cli seed --reset` only in dev)
- [x] 3.3.8 ER diagram in `docs/` _(docs/DATABASE.md generated by `cli er-diagram`)_
- **Done when:** fresh DB → `alembic upgrade head` → `cli seed` → 6 products, 11 variants, images linked.

---

## Phase 4 — Authentication & accounts

### 4.1 Backend
- [x] 4.1.1 `security.py`: Argon2 hash/verify, rehash-on-login if params change
- [x] 4.1.2 JWT encode/decode (exp, iat, jti, type), clock-skew leeway
- [x] 4.1.3 Opaque token generator + SHA-256 hashing
- [x] 4.1.4 User repository + service
- [x] 4.1.5 `POST /auth/register` (email normalisation, password policy, duplicate → 409)
- [x] 4.1.6 `POST /auth/login` (generic errors, constant-time path for unknown email, `last_login_at`)
- [x] 4.1.7 Refresh token issue, rotation, reuse detection (revoke family)
- [x] 4.1.8 Cookie settings per environment (Secure, SameSite=Lax, Path, Domain) _(Secure off only in development/test; SameSite=Lax; Path=/api/v1/auth; host-only (same-origin via /api proxy))_
- [x] 4.1.9 `POST /auth/refresh` (cookie + `X-Requested-With` + Origin check) _(also 30 s grace REFRESH_RACE for two tabs)_
- [x] 4.1.10 `POST /auth/logout`, `POST /auth/logout-all`
- [x] 4.1.11 Dependencies `get_current_user`, `require_role`, `require_permission`; `ROLE_PERMISSIONS` map
- [x] 4.1.12 `GET/PATCH /me`, `POST /me/change-password` (revokes other sessions) _(change-password lives at POST /auth/change-password so the refresh cookie identifies the current session)_
- [x] 4.1.13 Addresses CRUD + set default; Indian states list; phone/pincode validation; max 10
- [x] 4.1.14 Email service interface: console (dev) + provider (staging/prod); HTML + text templates _(console (dev) + Resend (prod) via HTTPS; text + HTML templates)_
- [x] 4.1.15 Forgot / reset password (hashed single-use token, 30 min, generic response, revoke sessions)
- [x] 4.1.16 Rate limits (login, register, forgot, reset) _(counted in Postgres (rate_limit_buckets) instead of slowapi — serverless instances don't share memory)_
- [x] 4.1.17 `cli create-admin`
- [x] 4.1.18 Tests: every flow, expiry (freezegun), rotation reuse, deactivated user, 401/403, rate limits

### 4.2 Frontend
- [x] 4.2.1 `.env` `VITE_API_BASE_URL`; `api/baseApi.js` (RTK Query, `credentials: 'include'`) _(same-origin /api/v1; no env var needed)_
- [x] 4.2.2 `baseQueryWithReauth` with single-flight refresh + retry; logout on refresh failure
- [x] 4.2.3 `authSlice` (user, accessToken, status) — token in memory only
- [x] 4.2.4 Session restore on app start (refresh) with loading gate
- [x] 4.2.5 Error mapping helper (API envelope → form errors/toasts)
- [x] 4.2.6 Install react-hook-form + zod _(react-hook-form 7 + zod 4)_
- [x] 4.2.7 Login page (`/login?next=`)
- [x] 4.2.8 Register page
- [x] 4.2.9 Forgot password page; Reset password page (token from URL)
- [x] 4.2.10 `RequireAuth`, `RequireRole` guards
- [x] 4.2.11 Header account menu (signed in/out states, logout)
- [x] 4.2.12 Account layout + Profile page + Change password page
- [x] 4.2.13 Addresses page (list, add, edit, delete with confirm, set default)
- [x] 4.2.14 Tests with MSW (login success/failure, refresh retry, guard redirect) _(MSW 2)_
- **Done when:** register → login → reload keeps session → logout; admin user can be created from CLI.

---

## Phase 5 — Catalogue APIs & admin catalogue

### 5.1 Backend public
- [x] 5.1.1 Schemas: `ProductCard`, `ProductDetail`, `VariantRead`, `CategoryTree`, `BrandRead`
- [x] 5.1.2 Listing query: filters (category incl. subcategories, brand, gender, shape, type, material, colour family, price range on cheapest variant, in stock), sort, pagination
- [x] 5.1.3 Search: full-text + trigram fallback, relevance sort
- [x] 5.1.4 Facets query with counts
- [x] 5.1.5 `GET /products`, `/products/facets`, `/products/{slug}`, `/products/{slug}/related`
- [x] 5.1.6 `GET /categories`, `GET /brands`
- [x] 5.1.7 Availability buckets (in stock / low / out) — no exact counts exposed
- [x] 5.1.8 Cache-Control headers on public catalogue _(browsers revalidate (max-age=0); CDN-Cache-Control 60 s for Vercel's edge)_
- [x] 5.1.9 Tests: each filter, combined filters, sorts, pagination bounds, inactive/deleted hidden, search

### 5.2 Backend admin
- [x] 5.2.1 Audit-log helper (records field-level changes)
- [x] 5.2.2 Slug generation + uniqueness
- [x] 5.2.3 Admin products: list (incl. inactive), create with variants, get, update, status change, soft delete
- [x] 5.2.4 Variants: create, update, soft delete; SKU conflict → 409; price ≤ MRP
- [x] 5.2.5 Inventory row auto-created with each variant
- [x] 5.2.6 Categories: CRUD, depth ≤ 2, cycle check, deactivate cascades visibility
- [x] 5.2.7 Brands: CRUD
- [x] 5.2.8 Cloudinary signed-upload endpoint (folder, formats jpg/png/webp, max size) _(key 'website' (Master admin) in backend/.env; real upload verified 2026-10-05)_
- [x] 5.2.9 Register uploaded image (verify via Admin API), update alt/primary/variant, reorder, delete (+ Cloudinary destroy) _(server checks the asset via Admin API; delete removes uploads/ assets from Cloudinary; verified live)_
- [x] 5.2.10 Tests incl. 403 for customers on every admin route _(route sweep: every admin route 401 anonymous / 403 customer)_

### 5.3 Storefront on API
- [x] 5.3.1 `catalogApi` endpoints (RTK Query)
- [x] 5.3.2 Shop page: URL params → query; facets drive filter panel; server pagination; skeletons; error + retry
- [x] 5.3.3 Product page: variant selector (colour/size), `?variant=SKU`, availability badge, variant images
- [x] 5.3.4 Related products from API
- [x] 5.3.5 Home featured products from API
- [~] 5.3.6 Category navigation (header/shop) from API _(shop category filter from API; header nav unchanged)_
- [x] 5.3.7 `<Img>` component with Cloudinary `srcSet` _(CloudImage)_
- [x] 5.3.8 Remove static catalog usage from the storefront (keep file only as seed input) _(catalog.js removed; legacy colour URLs redirect via Data/legacyProductUrls.js)_
- [x] 5.3.9 Product JSON-LD + meta tags (react-helmet-async)

### 5.4 Admin UI — catalogue
- [x] 5.4.1 Admin layout (lazy bundle): sidebar nav, top bar, `RequireRole`
- [x] 5.4.2 Install MUI X Data Grid; `AdminTable` wrapper (server pagination/sort/filter in URL, loading/empty/error) _(plain accessible tables with server pagination instead of MUI X Data Grid (lighter; catalogue is small))_
- [x] 5.4.3 `ConfirmDialog`, form field components
- [x] 5.4.4 Products list (search, category, brand, status, stock filters)
- [x] 5.4.5 Product editor — Details tab
- [x] 5.4.6 Product editor — Variants tab (inline grid: SKU, colour, size, MRP, price, active)
- [x] 5.4.7 Product editor — Images tab (signed upload, drag-drop, progress, reorder, primary, alt, per-variant)
- [x] 5.4.8 Product editor — Specifications tab (key/value rows)
- [x] 5.4.9 Activate/deactivate/delete with confirmation
- [x] 5.4.10 Categories page (tree, add/edit, subcategories, deactivate)
- [~] 5.4.11 Brands page (logo upload) _(brands page done; logo upload not built yet (keys now available))_
- **Done when:** admin creates a product with 2 variants and images; it appears in the shop with working filters.

---

## Phase 6 — Inventory

- [x] 6.1 Inventory service `adjust(variant, type, delta, note, actor)` with `SELECT … FOR UPDATE` + ledger row + audit log
- [x] 6.2 `reserve`, `release`, `commit_sale`, `restock_on_cancel` functions (used in Phase 8)
- [x] 6.3 Validation: result ≥ reserved, note required for negative adjustments
- [x] 6.4 `GET /admin/inventory` (search, filters, sort, pagination)
- [x] 6.5 `GET /admin/inventory/low-stock`
- [x] 6.6 `POST /admin/inventory/{variant_id}/adjustments`
- [x] 6.7 `PATCH /admin/inventory/{variant_id}` (threshold)
- [x] 6.8 `GET /admin/inventory/transactions`
- [x] 6.9 "Mark out of stock" = adjustment to zero available with note
- [x] 6.10 Tests: ledger correctness (20 → 18 → 28 example), negative guard, concurrency (parallel adjustments) _(includes real parallel transactions: 10 concurrent restocks, 5 buyers for the last item)_
- [x] 6.11 Admin UI: inventory grid (available / reserved / on hand, stock badges)
- [x] 6.12 Admin UI: restock / adjust dialog _(dialog also sets alert level and marks out of stock)_
- [x] 6.13 Admin UI: per-variant history drawer
- [x] 6.14 Admin UI: transactions log page with filters
- **Done when:** every stock change has a ledger row; stock can never go negative.

---

## Phase 7 — Cart

- [x] 7.1 Cart service: get-or-create, add (merge quantities), update, remove, clear
- [x] 7.2 Live pricing + line issues (OUT_OF_STOCK, PRICE_CHANGED, INACTIVE) _(issues are INACTIVE / OUT_OF_STOCK / INSUFFICIENT_STOCK; PRICE_CHANGED moved to the Phase 8 checkout quote, since carts never store prices)_
- [x] 7.3 Stock clamp on add/update (409 with available quantity)
- [x] 7.4 `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}`, `DELETE /cart` _(item routes keyed by variant_id (/cart/items/{variant_id}), not item id, so guest and server carts share one key)_
- [x] 7.5 `POST /cart/merge` (guest → server)
- [x] 7.6 `POST /cart/preview` (public guest pricing)
- [x] 7.7 Tests incl. ownership and merge edge cases
- [x] 7.8 Frontend: guest cart slice stores `{variant_id, quantity}` (migrate Phase-1 localStorage format) _(guest cart is localStorage v3 {variant_id, quantity}; v1/v2 dropped)_
- [x] 7.9 Frontend: `useCart()` hides guest vs server
- [x] 7.10 Frontend: cart page from API (priced lines, issues shown, optimistic quantity with rollback)
- [x] 7.11 Frontend: merge on login, clear guest cart
- [x] 7.12 Frontend: header badge from server cart when signed in
- [x] 7.13 Tests (MSW)
- **Done when:** cart follows the user across devices; guest cart merges on login.

---

## Phase 8 — Checkout & orders

### 8.1 Backend
- [x] 8.1.1 Pricing service: subtotal, discount (0 for now), shipping from settings, GST-inclusive tax split 👤 0.4.2/0.4.3 _(delivery fee setting (0 = free), GST-inclusive tax stored per order (rate in settings))_
- [x] 8.1.2 `POST /checkout/quote`
- [x] 8.1.3 Order number generator (DB sequence, `VO-YYMMDD-NNNN`)
- [x] 8.1.4 Order state machine (allowed transitions, who may trigger) + history writer
- [x] 8.1.5 `POST /orders`: idempotency key, lock inventory in variant order, reserve, snapshot prices/address, `expires_at`
- [x] 8.1.6 `GET /orders`, `GET /orders/{order_number}`, `POST /orders/{n}/cancel`
- [x] 8.1.7 FakeProvider payment for dev/tests ("simulate success/failure") _(replaced by manual payments: UPI to shop's ID (customer reports reference, staff confirm) and pay at store; FakeProvider not needed)_
- [x] 8.1.8 `mark_order_paid` (idempotent): commit sale, CONFIRMED, clear cart, email
- [x] 8.1.9 Expiry job (`cli expire-pending-orders`, `FOR UPDATE SKIP LOCKED`) _(lazy expiry + `cli expire-orders` + Vercel Cron GET /internal/expire-orders (CRON_SECRET))_
- [x] 8.1.10 Admin orders: list/search/filter, detail, status change (+ tracking fields), cancel (+ restock)
- [x] 8.1.11 Order emails: placed, confirmed, shipped (with tracking), delivered, cancelled
- [x] 8.1.12 Tests: totals, idempotent replay, **concurrent last-unit order**, expiry release, illegal transitions 409, ownership 404

### 8.2 Frontend
- [x] 8.2.1 Checkout route (auth required), address select / inline add
- [x] 8.2.2 Order summary from quote; price/stock change warnings
- [x] 8.2.3 Place order with idempotency key; disable double submit
- [x] 8.2.4 Payment step (FakeProvider in dev) _(UPI QR + upi:// link + 'I've paid' reference; pickup instructions)_
- [x] 8.2.5 Order confirmation page
- [x] 8.2.6 Account → Orders list + Order detail (timeline, tracking, cancel)
- [x] 8.2.7 Admin → Orders list (filters: status, payment, date, search)
- [x] 8.2.8 Admin → Order detail (items, customer, address, payments, timeline, actions, tracking entry, cancel with confirm)
- [x] 8.2.9 Remove legacy checkout/confirmation markup not reused _(old placeholder checkout CSS removed)_
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
- [~] 10.5 Settings: get/update (shipping, threshold, payment window, store contact) _(payments/delivery/order email done in Phase 8; store list editing and contact details pending)_
- [ ] 10.6 Tests for aggregates (timezone edges)
- [ ] 10.7 Dashboard UI: KPI cards, revenue chart, recent orders, low-stock list
- [ ] 10.8 Customers UI
- [ ] 10.9 Reports UI (date range, grouping)
- [~] 10.10 Settings UI _(payments/delivery/order email done in Phase 8; store list editing and contact details pending)_
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
- [ ] 12.2 👤 Owner accounts on vachanvijai@gmail.com: GitHub (repo transferred), Vercel Pro (Hobby is non-commercial), Neon via Vercel Marketplace — steps in docs/DEPLOYMENT.md
- [ ] 12.3 Managed Postgres staging + production (same region as API), backups on
- [~] 12.4 Vercel projects: vijai-opticians (frontend/) and vijai-opticians-api (backend/, Python function) _(config done: frontend/vercel.json, backend/vercel.json + api/index.py)_
- [~] 12.5 Migrations via GitHub Actions migrate.yml (MIGRATION_DATABASE_URL secret, unpooled); health check /health/ready _(workflow written)_
- [ ] 12.6 Environment variables per environment (§Appendix C)
- [ ] 12.7 Vercel env vars, preview deployments, headers in vercel.json
- [ ] 12.8 DNS: www → Vercel frontend project; API served same-origin via /api rewrite (no api subdomain)
- [ ] 12.9 Verify refresh cookie on Safari iOS (same-site)
- [ ] 12.10 Expire pending orders: lazy release during checkout + Vercel Cron (daily on Hobby, frequent on Pro)
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
