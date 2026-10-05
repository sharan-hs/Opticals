# Vijai Opticians — Audit, Target Architecture & Roadmap

Status: Phase 0 (audit + design). No project code has been modified.
Audited: `website4/` (git branch `Headerchanges`, HEAD `b24a88b`, plus uncommitted changes in 5 files and untracked `src/Utils/`).
Date: 2026-10-04

How this was verified: every source file was read; a production build was compiled (into a scratch dir, not the repo); the built site was driven in headless Chrome at 1920×1080, 1366×768, 768×1024 and 390×844 with scripted user flows; Cloudinary URLs were probed directly.

---

## Table of contents

- A. Existing project audit
- B. Current architecture
- C. Current features
- D. Partially implemented
- E. Missing
- F. Bugs / UI issues
- G. Reusable code
- H. Target architecture (diagrams)
- I. Database design (PostgreSQL)
- J. SQLAlchemy model design
- K. FastAPI API design
- L. Frontend architecture
- M. Admin architecture
- N. Authentication architecture
- O. Payment architecture
- P. Deployment architecture
- Q. Technology stack
- R. Priorities (P0/P1/P2)
- S. Phased roadmap
- T. What to build first
- Appendix: 3D model optimisation, testing plan, environments, migrations, logging, open questions for the shop owner

---

## A. Existing project audit

| Item | Finding |
|---|---|
| Framework | React 18.2 + Create React App (`react-scripts` 5.0.1). CRA is deprecated/unmaintained. |
| Origin | Fork of the open-source "Uomo" fashion template (package name `uomo`, `@UOMO`, "Dresses", T-shirt banners, author credit commented out in `Footer.jsx`). |
| Routing | React Router 6.22, `BrowserRouter`, 11 flat routes in `src/App.js`. Netlify SPA redirect in `netlify.toml`. |
| State | Redux Toolkit 2.2: `cart` slice (used), `wishlist` slice (registered, never used). No persistence. |
| Data | Two incompatible hardcoded sources: `src/Data/StoreData.js` (8 items, USD, local images, `productName/productPrice/frontImg`) and untracked `src/Utils/metadata.js` (11 Ray-Ban items, INR, Cloudinary, `name/price/images`). |
| Images | Cloudinary cloud `dyf8dp9oo`, URLs built by convention in `src/Utils/cloudinary.js` (`Products/{id}/{id}_{1..6}.png`), no transformations. Plus 19 MB of local assets in `src/Assets`. |
| 3D | `@react-three/fiber` 8 + `drei` 9 + `three` 0.167; `public/scene.gltf` + 5.6 MB `scene.bin` (Sketchfab "Eyewear (Specs)" by rojencha, **CC-BY-4.0**). |
| UI libs | MUI 5 (Accordion, Slider, Tooltip, Badge, Rating only), Swiper 11, react-icons, react-hot-toast. |
| Styling | One global plain-CSS file per component (~6,000 lines), generic class names, breakpoints 1210/768/450/320 px, `padding: 0 160px` repeated in ~20 files. |
| Backend / API | None. No service layer, no fetch/axios anywhere. |
| Auth | UI only (Login/Register/Reset forms with no handlers). |
| Tests | 1 default CRA test; suite cannot run (`Cannot find module 'swiper/react'`) and the assertion ("learn react") is stale. Effectively zero tests. |
| Build | Compiles with 15 ESLint warnings. Single JS chunk **450 KB gzipped (1.55 MB raw)**; build folder 23 MB (15 MB media, 51 files incl. unused template images). |
| Secrets | None committed (working tree + git history scanned). `.env` is git-ignored. Cloudinary cloud name is public and fine to keep. |
| Repo hygiene | Uncommitted work on Shop/Filter/Product + **untracked `src/Utils/`** (the whole Cloudinary integration) — at risk of loss. `allfiles.txt` (a `git ls-tree` dump) and unused `public/shirt_baked_2.glb` (1.1 MB) are tracked. |
| Local environment | Node 18.18, npm 10.2, Python 3.9.6 (EOL — use 3.12+), no PostgreSQL, no Docker. |

## B. Current architecture

```
index.js ── <Provider store> ── App.js
                                  ├── <ScrollToTop/> (outside the router; scroll button only)
                                  └── <BrowserRouter>
                                        ├── <Navbar/>  (reads cart.items.length)
                                        ├── <Routes>
                                        │     /             Home  → Hero(3D) · CollectionBox · Trendy(StoreData) · Services
                                        │     /shop         Shop  → ShopDetails(metadata+Cloudinary) + Filter ×2
                                        │     /product      ProductDetails → Product(router state) · AdditionalInfo(lorem) · RelatedProducts(StoreData)
                                        │     /cart         ShoppingCart (3 tabs: bag → fake checkout → fake confirmation)
                                        │     /loginSignUp  /resetPassword  (static forms)
                                        │     /about  /contact  /terms  /blog  /BlogDetails  *
                                        ├── <Footer/>
                                        └── <Toaster/>
Redux store: { cart: {items, totalAmount}, wishlist: {items} (unused) }
```

Data flow today: component imports a JS array → filters/sorts it in render → passes the whole product object through `<Link state>` to the product page → dispatches the whole object into the cart slice.

## C. Current features (actually working)

- Responsive storefront shell: sticky desktop header (≥1211 px), mobile header + slide-down menu, footer, 404 page.
- Home: hero with rotating 3D glasses + 4 colour buttons; collection tiles; "Trendy products" grid with 4 tabs; services strip.
- Shop: client-side filtering by category, colour, brand (with brand search) and price slider; 8 sort options; client-side pagination (6/page); mobile filter drawer; hover image swap.
- Product page (when reached from Shop): 6-image gallery with thumbnails and prev/next, name, ₹ price, SKU/category/brand tags.
- Cart (for Home/StoreData items only): add, change quantity (1–20), remove, line subtotals, empty state, count badge.
- Toast notifications (react-hot-toast).
- Contact page with two real store addresses and Google Maps embeds; About page with real company history (est. 1988, Vijayanagar; Basaveshwarnagar 2005).
- Scroll-to-top button.

## D. Partially implemented

| Area | State |
|---|---|
| Product data migration | Shop + product page moved to `metadata.js` + Cloudinary (uncommitted); Home, Related Products, Cart and Checkout still use the old `StoreData` shape → the cart breaks (see F1). |
| Product detail | Real name/price/images, but description, sizes (XS–XL), colours, specs, reviews are template placeholders; no URL id; selections not used. |
| Filters | Work client-side but duplicated state, not in URL, regression on pagination, colour list from a different source than products. |
| Cart | Redux only; no persistence; no variants; float totals; ignores product-page quantity. |
| Checkout | 3-step UI exists (good reusable layout) but no validation, no order, random order number, fake payment methods with lorem text. |
| Wishlist | Slice exists but unused; hearts are per-component local state. |
| Search | Icons and a mobile input exist; do nothing. |
| Auth | Login/Register/Reset forms styled; no logic. |
| Cloudinary | Delivery only; fixed 6-image assumption; no transformations; no upload flow. |
| 3D model | Renders and rotates; no loading state, not scaled per viewport, heavy, mobile scroll capture, missing licence attribution. |

## E. Missing

Backend; database; API layer; real product catalogue (variants, SKUs, stock); search; server-side filtering/pagination; product URLs (`/products/:slug`); authentication; customer account (profile, addresses, orders); real checkout; payments; orders and tracking; inventory; admin dashboard and all admin CRUD; image upload; legal pages (privacy, refund/cancellation, shipping — **Razorpay requires these for account activation**); SEO meta per page; error boundaries; loading skeletons; analytics; tests; CI/CD.

## F. Bugs / UI issues

Severity: **C** = breaks a core flow, **H** = wrong behaviour users will hit, **M** = quality/maintainability, **L** = minor.
"Verified" = reproduced in headless Chrome or by direct probe.

### F1. Functional bugs

| # | Sev | Bug | Where | Evidence |
|---|---|---|---|---|
| 1 | C | Items added from Shop/Product page show no image, no name, `$` price and **`$NaN` subtotal/total** in the cart. Shop products have `name/price/images`; the cart and slice read `productName/productPrice/frontImg`. | `cartSlice.js:22-26`, `ShoppingCart.jsx:147-208,381-407` | Verified (desktop + mobile) |
| 2 | C | Product page only works when navigated with router `state`. Home "Trendy" cards, Related Products, and cart links go to "No product found"; URLs can't be shared/bookmarked/indexed. | `Product.jsx:21,81`, `Trendy.jsx:121`, `ShoppingCart.jsx:146` | Verified |
| 3 | C | Product-page quantity is ignored: slice always sets `quantity: 1` / `+1`. | `cartSlice.js:21,25`, `Product.jsx:64-76` | Verified (selected 3 → cart shows 1) |
| 4 | C | Checkout is fake: "Place Order" shows "Your order is completed!" without creating anything; order number is `Math.random()` computed in render (changes on every re-render); cart not cleared; confirmation "Total" shows the subtotal while the table shows subtotal + 16. | `ShoppingCart.jsx:57,605-613,640,688` | Code |
| 5 | H | **Regression in uncommitted work:** changing a filter no longer resets to page 1 (HEAD had `setCurrentPage(1)`), so on page 2 a filter shows "No products match the selected filters." even when matches exist on page 1. | `ShopDetails.jsx:112-114` | Verified |
| 6 | H | Mixed currencies: `$` on Home, Related, Cart, Checkout; `₹` on Shop/Product. Hardcoded `$5` shipping and `$11` "VAT" (India uses GST). | `Trendy.jsx:161`, `ShoppingCart.jsx:381-407` | Verified |
| 7 | H | Every Ray-Ban sunglass is labelled "Reading Glasses": label is guessed from the product *name*, not `category`. | `ShopDetails.jsx:264-274` | Verified |
| 8 | H | "Date, new to old/old to new" and default sort do nothing: `a.productID - b.productID` on string IDs → `NaN`. | `ShopDetails.jsx:161-167` | Verified |
| 9 | H | Fixed 6 images per product: `orb3119m` and `orb3735` have only 5 → broken 6th thumbnail (HTTP 404). | `cloudinary.js:3,11`, `Product.jsx:91` | Verified (probe) |
| 10 | H | Two `<Filter>` instances (sidebar + drawer) each hold their own state → UI shows different selections than the applied filter. | `ShopDetails.jsx:190,369` | Code |
| 11 | H | Mobile: opening the menu then tapping the cart icon navigates to `/cart` but the menu stays open and `body` stays `overflow: hidden` (page can't scroll). The closed menu is only hidden with opacity/transform, so its links stay in the tab order (also on desktop, where `.mobile-menu` is never `display:none`). | `Navbar.jsx:28-31,115`, `Navbar.css:109-131` | Verified (scroll lock); code (focus) |
| 11b | H | Layout: About page scrolls horizontally at 1366 px (`.imgContent` extends to 1540 px); product page overflows horizontally at 390 px; hero canvas (700 px) sticks out of the 461 px hero by 120 px top and bottom at 1366×768. | `AboutPage.css`, `Product.css`, `HeroSection.css:9,88-90` | Verified |
| 12 | H | Auth forms have no `onSubmit`; pressing "Log In"/"Register" reloads the page. | `LoginSignUp.jsx:35,64` | Code |
| 13 | H | Search (desktop + mobile) and header wishlist do nothing; desktop icons only scroll to top. | `Navbar.jsx:81,97,130-135` | Code |
| 14 | M | `updateQuantity` clamp computes the difference after overwriting quantity (always 0). Latent (UI caps at 20). Totals accumulate floats; should be derived. | `cartSlice.js:39-42` | Code |
| 15 | M | Product page sizes XS–XL and colours Black/Red/Grey are hardcoded T-shirt leftovers and never reach the cart. | `Product.jsx:32-45` | Verified |
| 16 | M | "Clear" links inside MUI `AccordionSummary` also toggle the accordion (no `stopPropagation`). | `Filter.jsx:140,167,198,238` | Code |
| 17 | M | Related Products "Add to Cart" has no handler; product names only scroll to top. | `RelatedProducts.jsx:91,108` | Code |
| 18 | M | No scroll reset on route change; instead `scrollToTop` is copy-pasted ~12× and missing on some links. `ScrollToTop` adds a scroll listener that's never removed. | many; `ScrollToTop.jsx:9-17` | Code |
| 19 | L | Footer logo has a stray `Z` attribute; "Affiliates" links to `*`; footer phone `+1 246-345-0695` (US format) conflicts with Contact page numbers; contact emails are `@dummymail.com`. | `Footer.jsx:34,44,67`, `ContactPage.jsx:51,63` | Code |
| 20 | L | `console.log` of every product in production. | `ShopDetails.jsx:64-65` | Code |

### F2. Accessibility

- `index.html` declares a second viewport meta with `user-scalable=no` → blocks pinch-zoom (WCAG 1.4.4 failure).
- Clickable `<p>`, `<h4>`, `<div>` and bare SVG icons used as buttons (Add to Cart, tabs, pagination, wishlist, cart remove, mobile menu, colour pills) → not keyboard-operable, no focus styles, no accessible names.
- Most product images `alt=""`; inputs rely on placeholders instead of labels; brand checkbox labels not associated; Google Maps iframes have no `title`; colour swatches have no text alternative.
- Invalid DOM nesting / React warnings: `<th>` directly in `<tfoot>`, `<ul>` inside `<p>`, `selected` on `<option>`, `allowfullscreen`/`referrerpolicy` casing, missing `key` in checkout/confirmation tables, `type="mail"`.

### F3. Performance (measured)

Bytes transferred per page load (headless Chrome, cache disabled, uncompressed JS; on Netlify the JS is ~450 KB instead of 1.5 MB):

| Page | Transfer | Main contributors |
|---|---|---|
| Home `/` | **~16 MB** (all viewports) | `scene.bin` 5.5 MB, `men.jpg` 4.1 MB, `fem2.jpg` 1.7 MB, JS 1.5 MB, `kid.jpg` 1.2 MB |
| Shop `/shop` | ~9.5 MB | model + JS + Cloudinary PNG originals |
| `/cart`, `/terms`, `/contact`, `/loginSignUp` | **~7.2 MB each** | the 5.5 MB 3D model is downloaded on *every* route because `useGLTF.preload()` runs when `Model.jsx` is imported into the single bundle |

Layout shift: CLS 0.55 on desktop `/about` and 0.19 on desktop `/shop` (good is < 0.1) — images without dimensions.

- Home page pulls three camera-original JPEGs as CSS backgrounds: `men.jpg` 4480×6720 (4.2 MB), `fem2.jpg` 5328×3444 (1.7 MB), `kid.jpg` 3888×5184 (1.2 MB), plus the 5.6 MB model and the 450 KB-gz JS bundle (three.js shipped on every route).
- Cloudinary originals are full PNGs (~169 KB each); `f_auto,q_auto,w_600` serves the same image as WebP at ~16 KB (≈10× smaller). Shop loads 12 originals per page, the product page 6.
- No code-splitting, no `loading="lazy"`, no width/height on images (layout shift risk), 3D canvas renders 60 fps forever even when scrolled off-screen.
- Unused-but-imported components (Deal, Banner, LimitedEdition, Instagram, Popup) still pull their CSS/images into the build.

### F4. 3D model specifics

- `useGLTF.preload("/scene.gltf")` at module level + no code-splitting → the 5.5 MB model downloads on every page, not just Home (measured).
- No `<Suspense>` fallback → blank area until 5.6 MB downloads; no WebGL error fallback.
- "Responsive" logic sets scale `[1,1,1]` at every breakpoint; position tied to `window.innerWidth` instead of canvas size → glasses render ~70 px wide on mobile/tablet.
- Canvas is fixed at 700 px tall inside a `60vh` hero → overflows the hero on laptops; on ≤450 px the hero keeps `height: 60vh` while stacking text + 300 px canvas.
- `OrbitControls` sets `touch-action: none` on the canvas → on phones, swiping over the model doesn't scroll the page.
- Colour buttons mutate *all* cached GLTF materials including the translucent lens material; variable still named `tshirtColor`.
- Licence: CC-BY-4.0 requires visible attribution — currently missing.
- `castShadow/receiveShadow` set but shadows not enabled (dead cost); `shirt_baked_2.glb` unused.

### F5. Content / legal

- Lorem ipsum in Terms, About (mission/vision), product Description/Additional Info (cotton fabric, puffer jacket, 1.25 kg, 90×60×90 cm), payment-method descriptions, Blog.
- **Fabricated social proof**: "8k+ reviews", 5 stars on everything, two invented reviewers. Remove before launch (India's Consumer Protection (E-Commerce) Rules 2020 and fake-review rules).
- Marketing claims to confirm with the owner: "Winter Sale up to 60% off & free shipping", "24/7 support", "30-day money back", "free delivery over 15000".
- Brand name spelt "Vijay Opticians" in `<title>`, "Vijai Opticians" elsewhere; manifest still "React App"; meta description is the CRA default.

### F6. Code quality

- `Trendy.jsx` renders four ~65-line copies of the same card; the product card exists in 4 components; `handleAddToCart` + toast styling duplicated 4×.
- Global CSS with generic names (`.active`, `.productName`, `.brandRadio` reused across features) → collision risk.
- Dead code: `wishListSlice`, `Popup`, `DealTimer`, `Banner`, `LimitedEdition`, `Instagram`, Blog (+`BlogData`), ~33 unreferenced asset files, `shirt_baked_2.glb`, `allfiles.txt`; 15 unused imports (build warnings).

## G. Reusable existing code

| Keep | Why / changes needed |
|---|---|
| Overall visual design, Navbar, Footer, layout CSS | Looks professional; fix a11y, extract shared container/tokens. |
| Shop page layout (`ShopDetails` + `Filter` UI) | Good UX shell. Switch data to API, lift filter state into URL query params, one Filter instance. |
| Product page layout (`Product.jsx`, gallery) | Keep gallery & layout; replace hardcoded sizes/colours with real variant selector; load by slug. |
| Cart tab UI + responsive table/mobile list (`ShoppingCart.jsx/css`) | Split into `CartPage`, `CheckoutPage`, `OrderConfirmationPage`; keep markup/CSS. |
| Login/Register/Reset form styling | Wire to API with react-hook-form + validation. |
| `cartSlice` structure (RTK) | Becomes the *guest* cart (variant ids + qty, persisted); server cart via RTK Query. |
| Hero + `Model.jsx` | Keep (requirement); optimise per §Appendix A. |
| `cloudinary.js` idea | Becomes a URL builder from `public_id` + transformations. Existing public IDs `Products/{id}/{id}_{n}` keep working. |
| `metadata.js` content | Seed data: 11 entries → 6 products / 11 variants (RB4349 ×3 colours, Balorama ×2, Wayfarer Puffer ×2). |
| About/Contact real business content | Keep; fix contact details. |
| react-hot-toast, MUI, Swiper, react-icons | Keep; MUI also powers the admin UI. |

---

## H. Target architecture

Modular monolith: **React SPA → FastAPI → PostgreSQL**, Cloudinary for images, Razorpay for payments, transactional email provider for password reset and order emails. No Redis/queues/microservices.

### Customer
```
Customer
  ↓
React storefront (Vite SPA, RTK Query API layer)
  ↓  HTTPS JSON  (Authorization: Bearer <access JWT>; refresh via httpOnly cookie)
FastAPI  /api/v1/...
  ↓  Pydantic validation → service layer → repository (SQLAlchemy 2.x)
PostgreSQL
```

### Admin
```
Admin
  ↓
React Admin (/admin, lazy-loaded bundle, RequireRole ADMIN — UX only)
  ↓
FastAPI /api/v1/admin/...  → get_current_user → require_role(ADMIN)  ← the real gate
  ↓
PostgreSQL (+ audit_logs for every admin write)
```

### Product & images
```
Admin ──(1) POST /admin/uploads/signature──► FastAPI (signs params with CLOUDINARY_API_SECRET)
Admin ──(2) direct upload (signed) ─────────► Cloudinary  → returns public_id, version, width, height
Admin ──(3) POST /admin/products/{id}/images {public_id,...} ─► FastAPI ─► PostgreSQL (product_images)
Storefront ── builds https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,w_<n>/<public_id>
```

### Order
```
Customer → Cart (server cart; guest cart in localStorage merged at login)
  → Checkout: POST /checkout/quote (server prices, stock, shipping)
  → POST /orders  [one DB transaction: lock inventory rows, reserve stock, snapshot prices, order=PENDING_PAYMENT]
  → POST /payments/razorpay/orders  → FastAPI creates Razorpay order for the DB amount
  → Razorpay Checkout (customer pays)
  → POST /payments/razorpay/verify (signature)  and/or  POST /webhooks/razorpay (HMAC)
  → FastAPI verifies + fetches payment from Razorpay → payment=CAPTURED
  → order=CONFIRMED → reservation converted to SALE (inventory_transactions)
  → Order confirmation page / email → tracking → history
Unpaid orders expire after 30 min → reservation released.
```

### Authentication
```
React ──POST /auth/login──► FastAPI → verify Argon2 hash → issue access JWT (15 min, in memory)
                                                        + rotating refresh token (httpOnly cookie, hashed in DB)
React ──API call + Bearer JWT──► FastAPI dependency: decode JWT → load user (active?) → role check → handler
React ──401──► single-flight POST /auth/refresh (cookie) → new JWT → retry original request
```

## I. Database design (PostgreSQL 16/17)

Conventions: `bigint GENERATED ALWAYS AS IDENTITY` PKs; `timestamptz` (UTC) `created_at`/`updated_at`; **money as integer paise (`bigint`)**, never floats; `citext` for emails; enum-like columns as `varchar` + `CHECK` (easier to evolve with Alembic than native PG enums); soft delete via `deleted_at` where history matters; named constraints via SQLAlchemy naming convention.

Extensions: `citext`, `pg_trgm` (fuzzy search on name/SKU).

### users
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| email | citext | **UNIQUE**, NOT NULL |
| password_hash | text | Argon2id; NOT NULL |
| full_name | varchar(120) | NOT NULL |
| phone | varchar(15) | E.164, nullable |
| role | varchar(20) | CHECK in (`CUSTOMER`,`ADMIN`) — add `STAFF`,`MANAGER` later via migration; default `CUSTOMER` |
| is_active | boolean | default true (deactivation = soft block) |
| email_verified_at | timestamptz | nullable (P1 verification) |
| last_login_at | timestamptz | |
| deleted_at | timestamptz | account deletion → anonymise PII, keep orders |
| created_at / updated_at | timestamptz | |

Indexes: unique(email); index(role) partial `WHERE role <> 'CUSTOMER'`.
Why a role column instead of a roles table: two roles now, two later; permissions live in code (`ROLE_PERMISSIONS = {ADMIN: {...}, STAFF: {...}}`) so adding STAFF/MANAGER is a CHECK-constraint migration + a dict entry. Introduce `roles`/`permissions` tables only if the owner needs to configure roles at runtime.

### refresh_tokens
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK users ON DELETE CASCADE | indexed |
| token_hash | char(64) | SHA-256 of the opaque token; **UNIQUE** |
| family_id | uuid | rotation family; indexed |
| expires_at | timestamptz | |
| revoked_at | timestamptz | nullable |
| replaced_by_id | FK refresh_tokens | nullable |
| user_agent / ip | text / inet | for "sessions" view |
| created_at | timestamptz | |

### password_reset_tokens
id, user_id FK (CASCADE), token_hash UNIQUE, expires_at (30 min), used_at, created_at. Index(user_id).

### addresses
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK users | indexed |
| label | varchar(30) | "Home", "Work" |
| full_name, phone | varchar | NOT NULL |
| line1, line2, landmark | varchar | line1 NOT NULL |
| city, state | varchar | NOT NULL; state from Indian state list |
| pincode | char(6) | CHECK `pincode ~ '^[1-9][0-9]{5}$'` |
| country | char(2) | default `IN` |
| is_default | boolean | |
| deleted_at, created_at, updated_at | timestamptz | soft delete (orders snapshot the address anyway) |

Partial unique index: `UNIQUE (user_id) WHERE is_default AND deleted_at IS NULL` (one default per user).

### categories (with subcategories)
id, parent_id (self-FK, nullable, RESTRICT), name, slug (**UNIQUE**), description, image_public_id, sort_order, is_active, created_at, updated_at.
Constraints: `UNIQUE (parent_id, name)`; depth limited to 2 in the service. Seed: Eyeglasses, Sunglasses, Contact Lenses, Accessories (+ subcategories e.g. Reading glasses, Blue-light, Kids).
Optional `gst_rate_bp` (basis points) per category — see open questions.

### brands
id, name (citext **UNIQUE**), slug (**UNIQUE**), logo_public_id, is_active, created_at, updated_at.

### products (the model / design)
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | varchar(200) | NOT NULL |
| slug | varchar(220) | **UNIQUE** (URL) |
| brand_id | FK brands RESTRICT | indexed |
| category_id | FK categories RESTRICT | indexed (leaf or parent) |
| gender | varchar(10) | CHECK (`MEN`,`WOMEN`,`UNISEX`,`KIDS`) |
| frame_type | varchar(20) | nullable; CHECK (`FULL_RIM`,`HALF_RIM`,`RIMLESS`) |
| frame_shape | varchar(20) | nullable; e.g. `WAYFARER`,`AVIATOR`,`ROUND`,`RECTANGLE`,`SQUARE`,`CAT_EYE`,`OVAL`,`CLUBMASTER`,`GEOMETRIC` |
| frame_material | varchar(20) | nullable; `METAL`,`ACETATE`,`TR90`,`TITANIUM`,`PLASTIC`,`MIXED` |
| model_number | varchar(50) | e.g. "RB4349" |
| description | text | sanitised plain text/markdown, never raw HTML |
| specifications | jsonb | `[{label, value}]` — lens width, bridge, temple, UV400, polarised, warranty… |
| hsn_code | varchar(8) | for GST invoices |
| status | varchar(10) | CHECK (`DRAFT`,`ACTIVE`,`INACTIVE`) |
| is_featured | boolean | home page "trendy" |
| search_vector | tsvector | GENERATED from name, model_number, description (+ brand name maintained by service) |
| deleted_at, created_at, updated_at | timestamptz | |
| created_by / updated_by | FK users | audit |

Indexes: `(status, category_id)`, `(brand_id)`, `(gender)`, `(frame_shape)`, `(created_at DESC)`, GIN(`search_vector`), GIN trigram on `name`.
Frame attributes sit on the product because they don't change between colourways; contact lenses/accessories leave them NULL.

### product_variants (the sellable SKU)
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| product_id | FK products CASCADE | indexed |
| sku | varchar(40) | **UNIQUE on `upper(sku)`** (case-insensitive) |
| color_name | varchar(40) | "Havana", "Transparent Green" |
| color_family | varchar(20) | normalised filter value: `BLACK`,`BROWN`,`GOLD`,`BLUE`… |
| color_hex | char(7) | swatch |
| size_label | varchar(20) | e.g. "54-18-145" or "M" |
| lens_width_mm / bridge_mm / temple_mm | smallint | nullable |
| mrp_paise | bigint | CHECK > 0 (MRP display is mandatory in India) |
| price_paise | bigint | selling price; CHECK `0 < price_paise <= mrp_paise` |
| weight_grams | integer | shipping (nullable) |
| is_active | boolean | |
| sort_order | smallint | |
| deleted_at, created_at, updated_at | timestamptz | |

`UNIQUE (product_id, color_name, size_label)`. Discount is derived: `mrp − price`, `% = round(100·(mrp−price)/mrp)`. Listing price filters use the cheapest active variant (`min(price_paise)` via a lateral/aggregate subquery or a maintained `products.min_price_paise` column if listing gets slow).

### product_images
id, product_id FK CASCADE, variant_id FK nullable (colour-specific images), **public_id** varchar(255) (e.g. `Products/orb4349_havana/orb4349_havana_1`), version, format, width, height, bytes, alt_text, sort_order, is_primary, created_at.
Constraints: `UNIQUE (public_id)`, partial unique `(product_id, variant_id) WHERE is_primary`. DB stores Cloudinary identifiers, never files or full URLs.

### inventory (1:1 with variant)
| Column | Type | Notes |
|---|---|---|
| variant_id | PK + FK product_variants | |
| on_hand | integer | CHECK ≥ 0 |
| reserved | integer | CHECK ≥ 0 AND reserved ≤ on_hand |
| low_stock_threshold | integer | default 3 |
| updated_at | timestamptz | |

Available = `on_hand − reserved`. Indexed expression for low stock: `(on_hand - reserved)`.

### inventory_transactions (append-only ledger)
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| variant_id | FK | |
| type | varchar(20) | `RESTOCK`,`ADJUSTMENT`,`SALE`,`RETURN`,`DAMAGE`,`CORRECTION` |
| quantity_delta | integer | CHECK ≠ 0 (negative = out) |
| on_hand_after | integer | snapshot for history views |
| order_id | FK orders | nullable (SALE/RETURN) |
| note | text | required for ADJUSTMENT/DAMAGE |
| created_by | FK users | nullable (system) |
| created_at | timestamptz | |

Indexes: `(variant_id, created_at DESC)`, `(order_id)`, `(type, created_at)`. The service never UPDATEs/DELETEs rows (optionally enforce by revoking privileges).
Example from the brief: RESTOCK +20 → 20; SALE −2 (on payment) → 18; RESTOCK +10 → 28 — three rows, current value in `inventory.on_hand`.

### carts / cart_items
`carts`: id, user_id FK **UNIQUE** (one cart per user), created_at, updated_at.
`cart_items`: id, cart_id FK CASCADE, variant_id FK, quantity CHECK 1..10, created_at, updated_at; `UNIQUE (cart_id, variant_id)`. No prices stored — always priced live.

### orders
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| order_number | varchar(20) | **UNIQUE**, human-friendly (`VO-261004-0042`), used in customer URLs |
| user_id | FK users RESTRICT | |
| status | varchar(20) | see §O state machine |
| payment_status | varchar(20) | `UNPAID`,`PAID`,`REFUND_PENDING`,`REFUNDED`,`PARTIALLY_REFUNDED`,`FAILED` |
| currency | char(3) | `INR` |
| subtotal_paise, discount_paise, shipping_paise, tax_paise, total_paise | bigint | CHECKs ≥ 0; `total = subtotal − discount + shipping` (prices GST-inclusive; `tax_paise` is the included GST for invoices) |
| coupon_code | varchar(30) | nullable (P1) |
| shipping_address | jsonb | snapshot (name, phone, lines, city, state, pincode) |
| contact_email, contact_phone | | snapshot |
| customer_note | text | |
| courier_name, tracking_number, tracking_url | | admin-entered (P0), courier API later |
| expires_at | timestamptz | payment window for PENDING_PAYMENT |
| placed_at, paid_at, shipped_at, delivered_at, cancelled_at | timestamptz | |
| cancel_reason | text | |
| idempotency_key | uuid | **UNIQUE (user_id, idempotency_key)** — prevents double orders on double-click/retry |
| created_at, updated_at | timestamptz | |

Indexes: `(user_id, created_at DESC)`, `(status, created_at DESC)`, `(payment_status)`, `(created_at)` for reports, partial `(expires_at) WHERE status='PENDING_PAYMENT'`.

### order_items (immutable snapshot)
id, order_id FK CASCADE, variant_id FK RESTRICT, product_name, variant_label, sku, image_public_id, unit_mrp_paise, unit_price_paise, quantity (CHECK > 0), line_total_paise, gst_rate_bp, `configuration jsonb` (NULL now; future lens/prescription), `prescription_id` (future FK). Index(order_id), index(variant_id).

### order_status_history (audit trail)
id, order_id FK, from_status, to_status, note, changed_by FK users nullable (system/webhook), created_at. Index(order_id, created_at).

### payments
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| order_id | FK orders | 1 order : N attempts |
| provider | varchar(20) | `RAZORPAY` (`FAKE` in dev/tests) |
| provider_order_id | varchar(64) | **UNIQUE** |
| provider_payment_id | varchar(64) | **UNIQUE** nullable |
| amount_paise, currency | | copied from order at creation |
| status | varchar(20) | `CREATED`,`AUTHORIZED`,`CAPTURED`,`FAILED`,`REFUNDED` |
| method | varchar(20) | upi/card/netbanking/wallet (from provider) |
| error_code, error_description | | |
| raw | jsonb | provider response (no card data is ever received) |
| created_at, updated_at | | |

### payment_events (webhook inbox — idempotency)
id, provider, event_id **UNIQUE** (Razorpay `x-razorpay-event-id`), event_type, payload jsonb, signature_valid, processed_at, error, created_at.

### refunds (Phase 9 / P1)
id, payment_id FK, provider_refund_id UNIQUE, amount_paise, status, reason, created_by, created_at.

### audit_logs
id, actor_id FK users, action (`product.update`, `inventory.adjust`, `order.status_change`…), entity_type, entity_id, changes jsonb (`{field: [old, new]}`), ip, created_at. Index `(entity_type, entity_id)`, `(created_at)`.

### store_settings
key varchar PK, value jsonb, updated_by, updated_at. Holds shipping fee, free-shipping threshold, payment window minutes, low-stock default, contact details. Edited from Admin → Settings.

### P1 / future (designed, not built now)
- `wishlist_items` (user_id, product_id, created_at; PK both).
- `coupons` + `coupon_redemptions`.
- `prescriptions` (user_id, label, right_sph/cyl/axis/add, left_sph/cyl/axis/add, pd, prescribed_on, prescriber, file_public_id stored as Cloudinary **authenticated** asset, created_at) with CHECK ranges (SPH −20…+20 step 0.25, CYL −6…+6, AXIS 1–180). Health data → private, access-logged.
- `lens_options` (type, index, coating, price_paise); `order_items.configuration` + `prescription_id` attach them to a frame line. Nothing in the P0 schema has to change.

### Soft delete & history policy
- Products/variants/categories/brands: deactivate (`status`/`is_active`) for normal use; `deleted_at` for "delete"; hard delete only if never ordered (FK RESTRICT from order_items enforces it).
- Orders, order_items, payments, inventory_transactions, audit logs: never deleted.
- Users: deactivate; erasure requests anonymise PII but keep orders (tax records).

## J. SQLAlchemy model design

- SQLAlchemy 2.x typed ORM: `DeclarativeBase` with a `MetaData(naming_convention=...)` so Alembic produces stable constraint names; `Mapped[...]`/`mapped_column`.
- Mixins: `TimestampMixin` (`server_default=func.now()`, `onupdate=func.now()`), `SoftDeleteMixin`.
- Relationships: `Product.variants` (`cascade="all, delete-orphan"`, `order_by=sort_order`), `Product.images`, `ProductVariant.inventory` (`uselist=False`), `Order.items`, `Order.payments`, `Order.status_history`, `Category.children/parent`.
- Loading: default `lazy="raise"` on collections to forbid accidental N+1; repositories use `selectinload` explicitly (e.g. listing → `selectinload(Product.variants)`, `selectinload(Product.images)` limited to primary).
- Money: `Mapped[int]` paise; conversion only at the API boundary (Pydantic serialises both `price_paise` and a formatted string if useful).
- `search_vector`: `Computed(...)` column + `Index(..., postgresql_using="gin")`.
- Models live in one package (`app/models/`) so Alembic `env.py` imports a single `Base.metadata`.

**Sync vs async — decision: synchronous SQLAlchemy (psycopg 3) with plain `def` endpoints.**
FastAPI runs `def` endpoints in a thread pool, which is plenty for a small shop. Sync avoids async-ORM pitfalls (lazy-load `MissingGreenlet` errors, `AsyncSession` sharing bugs), keeps Alembic/tests/scripts simple, and the Razorpay SDK is synchronous anyway. Async would pay off only with thousands of concurrent long-lived I/O waits; switching later is mechanical because the layering isolates SQLAlchemy in repositories/services.

## K. FastAPI API design

Base path `/api/v1`. JSON only. Errors use one envelope:
```json
{ "error": { "code": "OUT_OF_STOCK", "message": "Only 1 left for RB4349-HAV-54", "details": {"variant_id": 12, "available": 1} }, "request_id": "..." }
```
Status codes: 400 business rule, 401 unauthenticated, 403 forbidden (role/ownership), 404, 409 conflict (duplicate SKU/slug, stock, illegal status transition, idempotency replay), 422 schema validation, 429 rate limited.
Pagination (all lists): `?page=1&page_size=20` (max 100; storefront max 48) → `{ "items": [...], "page": 1, "page_size": 20, "total": 134, "total_pages": 7 }`.
Auth column: Public / Customer (any logged-in user) / Admin (`role=ADMIN`; future roles get scoped permissions).

### Auth
| Method & URL | Auth | Request | Response | Validation / errors |
|---|---|---|---|---|
| POST `/auth/register` | Public, rate-limited | `{email, password, full_name, phone?}` | 201 `{user, access_token}` + refresh cookie | email format; password ≥ 8, not in common list; 409 email exists (generic message) |
| POST `/auth/login` | Public, rate-limited (5/min/IP+email) | `{email, password}` | `{user, access_token, expires_in}` + cookie | 401 generic "invalid credentials"; 403 deactivated |
| POST `/auth/refresh` | Refresh cookie + `X-Requested-With` header | – | `{access_token, expires_in}` + rotated cookie | 401 missing/expired/revoked; reuse of a rotated token revokes the whole family |
| POST `/auth/logout` | Refresh cookie | – | 204, cookie cleared | idempotent |
| POST `/auth/logout-all` | Customer | – | 204 | revokes all user refresh tokens |
| POST `/auth/forgot-password` | Public, rate-limited | `{email}` | 202 always (no account enumeration) | sends email with 30-min single-use token |
| POST `/auth/reset-password` | Public | `{token, new_password}` | 204 | 400 invalid/expired/used; revokes all sessions |

### Current user (`/me`)
| Method & URL | Auth | Request → Response | Errors |
|---|---|---|---|
| GET `/me` | Customer | → `{id, email, full_name, phone, role}` | 401 |
| PATCH `/me` | Customer | `{full_name?, phone?}` → user | 422 |
| POST `/auth/change-password` | Customer | `{current_password, new_password}` → 204 | 400 wrong current password; revokes other sessions (under `/auth` so the refresh cookie identifies the current session) |
| GET `/me/addresses` | Customer | → `[address]` | |
| POST `/me/addresses` | Customer | address → 201 address | pincode/phone/state validation; max 10 addresses |
| PATCH `/me/addresses/{id}` | Customer (owner) | partial → address | 404 if not owner (don't leak existence) |
| DELETE `/me/addresses/{id}` | Customer (owner) | → 204 (soft delete) | |
| POST `/me/addresses/{id}/default` | Customer (owner) | → 204 | |

### Catalogue (public)
| Method & URL | Request | Response | Notes |
|---|---|---|---|
| GET `/products` | `q, category, brand (multi), gender, frame_shape, frame_type, material, color (multi), min_price, max_price (rupees), in_stock, sort (relevance\|price_asc\|price_desc\|newest\|name_asc), page, page_size` | paginated `ProductCard {id, slug, name, brand, category, min_price, mrp, discount_pct, primary_image, colors[{name,hex}], in_stock}` | Only ACTIVE products with an active variant; unknown filter values → 422; full-text via `search_vector` + trigram fallback |
| GET `/products/facets` | same filters | `{brands:[{slug,name,count}], colors, frame_shapes, genders, price:{min,max}}` | drives filter sidebar counts |
| GET `/products/{slug}` | – | `ProductDetail {…, description, specifications, images[], variants[{id, sku, color, size, mrp, price, discount_pct, available_qty_bucket: in_stock\|low\|out}]}` | 404 if inactive/deleted; exact stock counts not exposed |
| GET `/products/{slug}/related` | `limit≤12` | `[ProductCard]` | same category/brand |
| GET `/categories` | – | tree of active categories | cached (Cache-Control 5 min) |
| GET `/brands` | – | active brands | |

### Cart
| Method & URL | Auth | Request → Response | Validation / errors |
|---|---|---|---|
| GET `/cart` | Customer | → `Cart {lines[{variant_id, sku, color_name, product_slug, product_name, image, quantity, unit_price_paise, mrp_paise, line_total_paise, max_quantity, issue?: INACTIVE\|OUT_OF_STOCK\|INSUFFICIENT_STOCK}], item_count, subtotal_paise, savings_paise, has_issues}` | prices always live; subtotal counts only lines without an issue; `Cache-Control: no-store` |
| POST `/cart/items` | Customer | `{variant_id, quantity}` → Cart | 404 not sold; 409 `OUT_OF_STOCK`/`INSUFFICIENT_STOCK` (`details.max_quantity`), `QUANTITY_LIMIT` (10 per colour), `CART_FULL` (30 lines); merges with the existing line |
| PATCH `/cart/items/{variant_id}` | Customer | `{quantity}` → Cart | lowering always allowed; raising needs stock; 404 if not in the cart |
| DELETE `/cart/items/{variant_id}` | Customer | → Cart | idempotent |
| DELETE `/cart` | Customer | → 204 | |
| POST `/cart/merge` | Customer | `{items:[{variant_id, quantity}]}` (guest cart, ≤ 50) → `Cart + adjusted_variant_ids` | sums, then clamps to 10 and to stock; drops colours no longer sold; keeps out-of-stock ones (shown as such); called right after sign-in |
| POST `/cart/preview` | Public | `{items:[{variant_id, quantity}]}` → priced Cart | lets guests see real prices without a server cart; unknown ids and never-published products are left out |

### Checkout & orders (customer)
| Method & URL | Auth | Request → Response | Validation / errors |
|---|---|---|---|
| POST `/checkout/quote` | Customer | `{address_id, coupon_code?}` → `{lines, subtotal, discount, shipping, tax_included, total, issues[]}` | address ownership; serviceable pincode (optional) |
| POST `/orders` | Customer, header `Idempotency-Key` | `{address_id, customer_note?}` → 201 `Order(status=PENDING_PAYMENT, expires_at)` | built from the **server cart**; 409 `OUT_OF_STOCK`/`PRICE_CHANGED` with details; 409 replay returns the original order |
| GET `/orders` | Customer | `page, status?` → paginated `OrderSummary` | own orders only |
| GET `/orders/{order_number}` | Customer (owner) | → `OrderDetail {items, totals, address, status, payment_status, history[], tracking}` | 404 if not owner |
| POST `/orders/{order_number}/cancel` | Customer (owner) | `{reason}` → Order | allowed in PENDING_PAYMENT, CONFIRMED (not after PROCESSING); paid → refund initiated |

### Payments
| Method & URL | Auth | Request → Response | Notes |
|---|---|---|---|
| POST `/payments/razorpay/orders` | Customer (owner) | `{order_number}` → `{key_id, razorpay_order_id, amount, currency, name, prefill{name,email,contact}}` | amount from DB; 409 if order not PENDING_PAYMENT/expired; reuses an open attempt |
| POST `/payments/razorpay/verify` | Customer (owner) | `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` → `{order_number, status, payment_status}` | HMAC-SHA256(order_id\|payment_id, key_secret) **and** fetch payment from Razorpay to confirm `captured` + amount; idempotent |
| POST `/webhooks/razorpay` | None (HMAC `X-Razorpay-Signature` over raw body with webhook secret) | Razorpay event → 200 | dedup on event id; handles `payment.captured`, `payment.failed`, `order.paid`, `refund.processed` |
| GET `/orders/{order_number}/payment-status` | Customer (owner) | → `{status, payment_status}` | polled by the "processing payment" screen |

### Admin (all: `require_role(ADMIN)`, every write → `audit_logs`)
| Area | Endpoints |
|---|---|
| Dashboard | GET `/admin/dashboard/summary` → revenue (total / today / month, paid orders only), orders by status, product count, low-stock count, recent 10 orders. GET `/admin/dashboard/revenue-trend?from&to&granularity=day\|week\|month` → `[{period, revenue, orders}]` |
| Products | GET `/admin/products` (q, category, brand, status, stock_status, sort, page) · POST `/admin/products` (product + ≥1 variant) · GET/PUT `/admin/products/{id}` · PATCH `/admin/products/{id}/status` `{status}` · DELETE `/admin/products/{id}` (soft; 409 if it would orphan open carts → removes cart lines) |
| Variants | POST `/admin/products/{id}/variants` · PATCH `/admin/variants/{id}` (sku, colour, size, mrp, price, active) · DELETE `/admin/variants/{id}` (soft). 409 duplicate SKU; price ≤ MRP |
| Images | POST `/admin/uploads/signature` `{folder}` → signed params (timestamp, signature, api_key, folder, allowed formats, max bytes) · POST `/admin/products/{id}/images` `{public_id, version, width, height, format, bytes, variant_id?, alt_text}` (server re-checks asset exists via Cloudinary Admin API) · PATCH `/admin/images/{id}` · PUT `/admin/products/{id}/images/order` `[ids]` · DELETE `/admin/images/{id}` (also deletes in Cloudinary) |
| Categories | GET `/admin/categories` · POST · PATCH `/admin/categories/{id}` (name, slug, parent, sort, active). 409 slug; 400 cycle/depth > 2; deactivating a parent hides children |
| Brands | GET `/admin/brands` · POST · PATCH `/admin/brands/{id}` |
| Inventory | GET `/admin/inventory` (q by SKU/name, category, brand, stock_status in\|low\|out, sort by available/name/updated, page) · GET `/admin/inventory/low-stock` · POST `/admin/inventory/{variant_id}/adjustments` `{type: RESTOCK\|ADJUSTMENT\|DAMAGE\|RETURN\|CORRECTION, quantity_delta, note}` → new levels (400 if result < reserved; note required for negative) · PATCH `/admin/inventory/{variant_id}` `{low_stock_threshold}` · GET `/admin/inventory/transactions` (variant_id, type, from, to, page) |
| Orders | GET `/admin/orders` (q = order no/email/phone, status, payment_status, from, to, sort, page) · GET `/admin/orders/{id}` (items, customer, address, payments, history) · POST `/admin/orders/{id}/status` `{to_status, note?, courier_name?, tracking_number?}` (409 illegal transition) · POST `/admin/orders/{id}/cancel` `{reason, refund: true}` · POST `/admin/orders/{id}/refunds` `{amount_paise, reason}` (P1 partial) |
| Customers | GET `/admin/customers` (q, active, page) · GET `/admin/customers/{id}` (profile, addresses, order history, lifetime value) · PATCH `/admin/customers/{id}` `{is_active}` |
| Reports | GET `/admin/reports/sales?from&to&group_by=day\|month\|product\|category\|brand` · GET `/admin/reports/sales.csv` (P1) |
| Settings | GET/PUT `/admin/settings` (shipping fee, free-shipping threshold, payment window, store contact) |

### System
GET `/health` (liveness, no DB) · GET `/health/ready` (DB `SELECT 1`, migration head check) · OpenAPI docs at `/docs` **disabled in production** (or behind admin auth).

### Backend project structure
Feature modules with the requested layering inside each (route → service → repository):
```
backend/
├── app/
│   ├── main.py                # app factory: routers, middleware, exception handlers
│   ├── core/
│   │   ├── config.py          # pydantic-settings, env-specific
│   │   ├── database.py        # engine, SessionLocal, get_db
│   │   ├── security.py        # Argon2 (pwdlib), JWT (PyJWT), token hashing
│   │   ├── deps.py            # get_current_user, require_role(), pagination params
│   │   ├── errors.py          # AppError hierarchy + handlers → error envelope
│   │   ├── logging.py         # JSON logs + request_id middleware
│   │   └── rate_limit.py      # slowapi limiter (in-memory; single instance)
│   ├── models/                # all SQLAlchemy models (one Base.metadata)
│   ├── modules/
│   │   ├── auth/              router.py · schemas.py · service.py · repository.py
│   │   ├── users/             (me, addresses)
│   │   ├── catalog/           (products, categories, brands, search, facets)
│   │   ├── media/             (Cloudinary signing + verification)
│   │   ├── inventory/
│   │   ├── cart/
│   │   ├── orders/            (checkout pricing, order state machine)
│   │   ├── payments/          providers/{base.py, razorpay.py, fake.py} · webhooks.py
│   │   ├── notifications/     (email templates + provider)
│   │   └── admin/             (dashboard, reports, customers, settings routers; reuse services above)
│   ├── jobs/                  # expire_pending_orders, reconcile_payments (CLI entry points)
│   └── cli.py                 # create-admin, seed-from-metadata
├── alembic/  alembic.ini
├── tests/  (unit/, api/, integration/)
├── pyproject.toml  uv.lock
└── .env.example
```
Why feature folders instead of top-level `api/ services/ repositories/`: each feature's router/schemas/service/repository change together; top-level layer folders become 10-file grab-bags. Models stay central for Alembic. Repositories are thin query modules; services own the transaction boundary (`db.commit()` at the end of a use case, rollback in `get_db` on exception).

FastAPI features used deliberately: `Depends` for DB session, current user, role checks and pagination; Pydantic v2 schemas (separate Create/Update/Read); exception handlers for `AppError`, `RequestValidationError`, `IntegrityError` (→ 409); middleware for request id, timing, security headers; `CORSMiddleware` with exact origins + `allow_credentials=True`; `BackgroundTasks` for emails; `lifespan` for startup checks. Not used: async DB, Celery, Redis.

## L. Frontend architecture

Keep React + existing components; change the plumbing.

1. **Build tool: migrate CRA → Vite** (half a day, no component rewrites). CRA is deprecated, its Jest setup can't even load Swiper, and env handling (`VITE_API_BASE_URL`) is needed for the API. Rename JSX-containing `.js` files to `.jsx`, move `index.html` to the root, replace `%PUBLIC_URL%`.
2. **API layer: RTK Query** (already on Redux Toolkit). One `baseApi` with `fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_BASE_URL, credentials: 'include' })`, wrapped by `baseQueryWithReauth` (single-flight refresh on 401, then retry). Endpoints injected per feature (`catalogApi`, `cartApi`, `authApi`, `ordersApi`, `adminApi`). Components call hooks (`useGetProductsQuery(params)`); no `fetch` in components. RTK Query gives `isLoading/isFetching/error`, caching, and tag invalidation (e.g. adding to cart invalidates `Cart`).
3. **Folder layout**
```
src/
  app/        store.js, router.jsx, AppLayout.jsx, ErrorBoundary.jsx
  api/        baseApi.js, baseQueryWithReauth.js, errors.js
  features/
    auth/     authSlice (accessToken, user), RequireAuth, RequireRole, Login/Register/Forgot/Reset pages
    catalog/  ShopPage (existing ShopDetails), FilterPanel (single instance), ProductCard (one component), ProductPage, VariantSelector
    cart/     guestCartSlice (localStorage), useCart() (guest vs server), CartPage
    checkout/ CheckoutPage (address + summary), PaymentStep (Razorpay), OrderConfirmationPage
    account/  Profile, Addresses, Orders, OrderDetail, Security
    admin/    (lazy-loaded, see §M)
  components/ Header, Footer, Hero (3D), Skeleton, EmptyState, ErrorState, ConfirmDialog, Price, Img (Cloudinary)
  lib/        cloudinary.js (url builder), money.js (formatINR(paise)), notify.js (toasts)
  pages/      About, Contact, Terms, Privacy, Refund, Shipping, NotFound
```
4. **Routes**: `/`, `/shop` (+ `?q&category&brand&color&shape&gender&min&max&sort&page` via `useSearchParams` — shareable, back-button safe), `/products/:slug` (`?variant=SKU`), `/cart`, `/checkout` (auth), `/checkout/pay/:orderNumber`, `/orders/:orderNumber/confirmation`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account/*` (auth), `/admin/*` (ADMIN), static pages. Route-level `React.lazy` code splitting; `ScrollRestoration`-style scroll reset on navigation (removes the 12 copies of `scrollToTop`).
5. **Auth on the client**: access token only in Redux memory (never localStorage); on app start call `/auth/refresh` to restore the session; `RequireAuth` redirects to `/login?next=`; `RequireRole` hides admin UI (backend still enforces).
6. **Cart sync**: guest cart = `[{variant_id, quantity}]` in localStorage, priced via `POST /cart/preview`; on login → `POST /cart/merge` then clear the guest cart; logged-in cart is server state (RTK Query, optimistic quantity updates, rollback on 409 with a toast).
7. **Order creation**: checkout page generates an idempotency key once per attempt; "Place order" → `POST /orders` → Razorpay → verify → confirmation page reads `GET /orders/{n}`.
8. **States**: skeletons for grid/product/cart, `EmptyState` (no results, empty cart, no orders), `ErrorState` with retry, route `ErrorBoundary`, toasts via one `notify` helper, disabled + spinner buttons during mutations.
9. **Forms**: react-hook-form + zod (labels, inline errors, server error mapping).
10. **Images**: `<Img publicId w=… sizes=…>` emitting `srcSet` with `f_auto,q_auto,w_*`, `loading="lazy"`, explicit `width/height`/`aspect-ratio`.
11. **SEO**: per-route `<title>`/meta (react-helmet-async), product JSON-LD, sitemap from API. (SSR isn't needed now.)

## M. Admin architecture

- Separate lazy-loaded bundle under `/admin` with its own layout: left nav (Dashboard, Products, Categories, Brands, Inventory, Orders, Customers, Sales/Reports, Settings), top bar with user menu. No POS/billing.
- Built with **MUI** (already a dependency) + **MUI X Data Grid** (free tier: server-side pagination, sorting, filter) + **MUI X Charts** or Recharts for revenue trends.
- Shared `AdminTable` wrapper: server-side search/filter/sort/pagination bound to URL params, loading overlay, empty and error states, row actions with `ConfirmDialog` for destructive actions.
- Pages:
  - Dashboard: KPI cards (total/today/month revenue, orders by status, products, low stock), revenue trend chart, recent orders table, low-stock list.
  - Products: list (status, stock badge), editor with tabs: Details, Variants (inline grid: SKU, colour, size, MRP, price, stock, active), Images (drag-drop upload → Cloudinary, reorder, set primary, per-variant), Specifications (key/value rows), SEO.
  - Categories (tree with subcategories), Brands (list + logo).
  - Inventory: grid of variants with available/reserved/on-hand, quick "+ Restock / − Adjust" dialog (note required), low-stock filter, per-variant history drawer, global transactions log.
  - Orders: filters (status, payment, date), detail page with items, customer, address, payment attempts, timeline, status-change actions limited to legal transitions, tracking entry, cancel/refund with confirmation.
  - Customers: list, detail with orders/lifetime value, activate/deactivate.
  - Reports: sales by day/month/product/category/brand, CSV export (P1).
  - Settings: shipping fee/threshold, payment window, store contact info.
- Security: admin bundle only loads for ADMIN users; all authorization on the backend; admin account created via CLI; consider TOTP 2FA for admins (P1).

## N. Authentication architecture

| Decision | Choice | Reason |
|---|---|---|
| Password hashing | Argon2id via `pwdlib` | Current OWASP recommendation; `passlib` is unmaintained |
| Access token | JWT (HS256, `JWT_SECRET` ≥ 32 random bytes), 15-min expiry, claims `sub, role, type=access, iat, exp, jti` | Stateless, short-lived |
| Storage (client) | Access token in memory (Redux) only | Not readable after XSS-driven page reload; never in localStorage |
| Refresh token | Opaque 256-bit random string in `httpOnly; Secure; SameSite=Lax; Path=/api/v1/auth` cookie, 30-day expiry; stored as SHA-256 hash | Revocable, survives reloads |
| Rotation | New refresh token on every refresh; old one marked replaced; reuse of a replaced token → revoke the whole family | Detects stolen tokens |
| CSRF | Refresh/logout require custom header `X-Requested-With: fetch` + Origin check; all other endpoints use Bearer header (not cookies) | Cookie-auth endpoints are tiny |
| Cookie domain | Frontend `www.<domain>`, API `api.<domain>` → same-site, so `SameSite=Lax` works and Safari ITP doesn't drop the cookie | Avoid `SameSite=None` third-party cookies |
| Per-request check | `get_current_user` decodes JWT **and** loads the user (active? role?) from DB | Deactivation/role change takes effect immediately |
| Authorization | `require_role("ADMIN")` dependency on the whole `/admin` router; ownership checks in services (`order.user_id == current_user.id`) | Backend is the authority |
| Rate limiting | slowapi: login 5/min, register 3/min, forgot-password 3/hour per IP + per email | Brute force / abuse |
| Password reset | Single-use hashed token, 30-min expiry, generic responses, revoke sessions on reset | No enumeration |
| Logout | Revoke refresh token + clear cookie; access token expires within 15 min | Simple |
| Future roles | `STAFF` (orders + inventory), `MANAGER` (+ products, reports) via `ROLE_PERMISSIONS` and `require_permission("orders:write")` | No schema change beyond CHECK |

Example of the required layering: React hides `/admin` for non-admins **and** FastAPI rejects `GET /api/v1/admin/orders` with 401 (no/invalid token) or 403 (role ≠ ADMIN).

## O. Payment architecture & order flow

**Provider: Razorpay** is a good fit (Indian market, UPI/cards/netbanking/wallets, Standard Checkout, signed webhooks, test mode, refunds API). Alternatives if fees/onboarding differ: Cashfree, PhonePe PG, PayU — the provider interface below keeps this swappable. Re-confirm current pricing and KYC requirements at implementation time. Activation requires the site to publish Contact, Terms, Privacy, Refund/Cancellation and Shipping policies.

**Module design** (`app/modules/payments/`):
```python
class PaymentProvider(Protocol):
    def create_order(self, *, amount_paise: int, currency: str, receipt: str) -> ProviderOrder: ...
    def verify_checkout_signature(self, *, order_id: str, payment_id: str, signature: str) -> bool: ...
    def fetch_payment(self, payment_id: str) -> ProviderPayment: ...
    def verify_webhook(self, raw_body: bytes, signature: str) -> bool: ...
    def refund(self, *, payment_id: str, amount_paise: int) -> ProviderRefund: ...
```
`RazorpayProvider` for staging/prod (test vs live keys), `FakeProvider` for local dev and automated tests. Checkout and orders never import Razorpay directly, so payment can be added in Phase 9 without touching checkout.

**Order state machine** (status) — payment status tracked separately:
```
PENDING_PAYMENT ──paid──► CONFIRMED ──► PROCESSING ──► SHIPPED ──► DELIVERED
      │                      │              │
      │ expiry/fail          │ cancel       │ cancel (admin only)
      ▼                      ▼              ▼
  CANCELLED              CANCELLED  (payment_status → REFUND_PENDING → REFUNDED)
DELIVERED ──► RETURN_REQUESTED ──► RETURNED   (P1)
```
`REFUNDED` from the brief becomes a payment status rather than an order status (an order can be cancelled-and-refunded or returned-and-refunded). Customers may cancel until CONFIRMED; admins until before SHIPPED.

**Stock & overselling — one DB transaction in `POST /orders`:**
1. Load cart lines; `SELECT ... FROM inventory WHERE variant_id IN (...) ORDER BY variant_id FOR UPDATE` (consistent lock order prevents deadlocks).
2. For each line check `on_hand − reserved ≥ qty`, else raise `OUT_OF_STOCK` (rollback).
3. `reserved += qty`; insert order (PENDING_PAYMENT, `expires_at = now + 30 min`) and order_items with price snapshots from the DB.
4. Commit. CHECK constraints (`reserved ≤ on_hand`, `on_hand ≥ 0`) are the last line of defence.
(Equivalent single-statement form: `UPDATE inventory SET reserved = reserved + :q WHERE variant_id = :v AND on_hand - reserved >= :q RETURNING ...`; zero rows → out of stock.)

On payment captured (verify endpoint or webhook, whichever first — both call the same idempotent `mark_order_paid`): lock order row `FOR UPDATE`; if already PAID return; `on_hand −= qty`, `reserved −= qty`, insert `SALE` ledger rows, order → CONFIRMED, payment → CAPTURED, clear cart, enqueue confirmation email.
On failure/expiry: job every 5 min (`SELECT ... WHERE status='PENDING_PAYMENT' AND expires_at < now() FOR UPDATE SKIP LOCKED`) first asks Razorpay whether the order was paid (reconciliation), otherwise releases `reserved` and cancels. Late payment after expiry → re-reserve if stock remains, else auto-refund and notify.
Cancellation of a CONFIRMED order: `on_hand += qty` with a `RETURN`-type (or `CANCEL_RESTOCK`) ledger row, refund via provider.

**Never trusted from the client:** prices, totals, discounts, shipping, payment success flags. The client sends only ids, quantities, address id, and Razorpay's three ids/signature, which the server verifies.

## P. Deployment architecture

| | Option A: Managed PaaS | Option B: Single VPS | Option C: Full cloud (AWS/GCP) |
|---|---|---|---|
| Shape | Netlify/Vercel (SPA) + Render/Railway/Fly (FastAPI) + managed Postgres (Render PG/Neon/Supabase) | One VM (Hetzner/DigitalOcean/Lightsail) running Caddy + FastAPI + Postgres via Docker Compose | CloudFront+S3, ECS/App Runner, RDS, Secrets Manager |
| Cost (approx., verify current pricing) | ₹0 frontend + ~₹600–1,000 API + ₹0–1,500 DB → **~₹1–2.5k/month** | **~₹500–1,500/month** | ₹3–8k+/month |
| Complexity | Low (git push deploys) | Medium (you run Linux, Docker, firewall, upgrades) | High |
| Maintenance | Provider patches OS/DB | You patch OS, Postgres, certs, backups | Medium–high |
| Performance | Good if API and DB share a region | Good | Excellent |
| Scalability | Scale plan/instances | Vertical only | Horizontal |
| SSL / domain | Automatic | Caddy auto-TLS | ACM, more setup |
| Env vars / secrets | Dashboard per environment | `.env` files on the server | Secrets Manager |
| Backups | Managed daily (PITR on paid tiers) + your weekly `pg_dump` | Entirely yours | Managed |
| CI/CD | Built-in Git deploys + GitHub Actions tests | GitHub Actions → SSH deploy | CodePipeline/Actions |
| Cloudinary / Razorpay | Same everywhere (external services) | Same | Same |
| Main risk | Free tiers sleep (bad for webhooks) → use paid API tier | Single machine; ops burden on you | Cost/overkill |

**Decision (2026-10-04): Option A on Vercel, all accounts owned by the shop (vachanvijai@gmail.com).** Details and setup steps: `docs/DEPLOYMENT.md`.
- Frontend: Vercel project (root `frontend/`), custom domain `www.<domain>`. It forwards `/api/*` to the backend project, so the browser is same-origin with the API (first-party refresh cookie, no CORS).
- API: second Vercel project (root `backend/`) running FastAPI as a Python function. Serverless consequences: no background process; recurring jobs via Vercel Cron hitting protected endpoints; expired reservations also released lazily during checkout; rate limits stored in Postgres; email sent within the request.
- Database: Neon Postgres from the Vercel Marketplace, Singapore region; app uses the pooled URL, migrations use the direct URL from a GitHub Actions workflow on `main`. Daily backups + weekly `pg_dump` via a scheduled GitHub Action.
- Plan: Vercel Pro (Hobby is non-commercial only).
- Monitoring: Sentry (free tier) for React + FastAPI, UptimeRobot/Better Stack ping on `/health/ready`, platform logs.
- Move to Option B later only if costs matter more than ops time.

Repository structure: convert the existing `Opticals` repo into a monorepo (use `git mv` to keep history):
```
Opticals/
├── frontend/            # current website4 (Vite after Phase 1)
├── backend/             # FastAPI
├── docs/                # this plan, ADRs, runbooks
├── .github/workflows/   # ci-frontend.yml, ci-backend.yml, backup.yml
├── docker-compose.yml   # later (optional): postgres for local dev / VPS option
└── README.md
```
Docker: **not required now** (not installed locally; PaaS builds without it). Use Postgres.app or Homebrew Postgres + `uv` locally. Add a backend `Dockerfile` when deploying (deterministic builds) and a compose file only if a second developer joins or Option B is chosen.

## Q. Technology stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, React Router 6, Redux Toolkit + **RTK Query**, react-hook-form + zod, MUI 5 (+ MUI X Data Grid/Charts for admin), Swiper, react-hot-toast, react-helmet-async, @react-three/fiber + drei (hero only, lazy) |
| Backend | Python 3.12+, FastAPI, Pydantic v2 + pydantic-settings, SQLAlchemy 2.x (sync) + psycopg 3, Alembic, PyJWT, pwdlib[argon2], slowapi, cloudinary SDK, razorpay SDK, httpx, structlog/JSON logging, sentry-sdk |
| Tooling | uv (Python deps), ruff (lint/format), mypy (optional), pytest + pytest-cov, ESLint + Prettier, Vitest + React Testing Library + MSW, Playwright (E2E), GitHub Actions |
| Data | PostgreSQL 16/17 (`citext`, `pg_trgm`, full-text search) |
| Services | Cloudinary (images), Razorpay (payments), Brevo/Resend/SES (transactional email), Sentry, UptimeRobot |

## R. Priorities

Reviewed against the actual code:

**P0 — must have before launch**
Product catalogue with variants & SKUs · search + filters + pagination (server-side) · product URLs · customer auth (register/login/logout/forgot/reset/change password) · admin auth + role enforcement · admin product/category/brand management + image upload · inventory with ledger · cart (guest + persistent) · address management · checkout with server pricing · orders + history + tracking (manual tracking number) · Razorpay online payment with webhooks · admin order management · responsive/accessible frontend · **plus (found in audit):** fix cart/currency bugs, remove fake reviews/lorem/fake claims, legal pages (privacy, terms, refund, shipping), contact info correction, 3D model attribution + optimisation, transactional emails (reset + order confirmation), basic admin dashboard KPIs.

**P1 — important, soon after launch**
Sales analytics & CSV export · advanced filters (facet counts, size ranges) · wishlist (slice exists) · customer management detail · inventory analytics · coupons (UI field exists) · returns flow · partial refunds · email verification · admin 2FA · courier integration (e.g. Shiprocket) · COD (owner decision) · newsletter/contact form backend.

**P2 — future**
Prescription management · lens customisation & power-based pricing · virtual try-on · AI recommendations · loyalty · advanced analytics · blog (template blog removed until there's content).

## S. Phased roadmap

Durations assume one developer part-time-ish; adjust freely.

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 Audit** | This document | Owner answers open questions |
| **1 Frontend cleanup** (1–2 wks) | Commit/branch current work; CRA → Vite; fix F1 bugs on the current static data (single product shape, cart fields, currency ₹, page reset, labels, sorts, quantity); `/products/:slug` route; scroll restoration; one `ProductCard`; delete dead code/assets; image weights (resize collection images, Cloudinary `f_auto,q_auto,w_`); 3D optimisation + attribution; a11y pass (buttons, labels, zoom); remove fake reviews/claims; route code-splitting | Lighthouse mobile perf ≥ 80, no console errors, no horizontal overflow at 360/390/768/1366/1920 |
| **2 FastAPI foundation** (1 wk) | Monorepo; `backend/` skeleton, config, logging, errors, health, CORS, Alembic, pytest + CI | `GET /health/ready` green in CI and staging |
| **3 Database** (1 wk) | Models + migrations for users, catalogue, variants, images, inventory, carts, orders, payments, audit, settings; seed script from `metadata.js` + Cloudinary Admin API | `alembic upgrade head` on empty DB; seed shows 6 products/11 variants |
| **4 Authentication** (1 wk) | Register/login/refresh/logout/forgot/reset/change password, `/me`, addresses, admin CLI, role deps, rate limits, email provider; frontend auth slice + pages | E2E: register → login → refresh survives reload → logout |
| **5 Product APIs** (1–2 wks) | Public listing/search/filters/facets/detail/related; admin CRUD for products/variants/categories/brands/images; frontend Shop/Product on API | Shop fully API-driven, filters in URL |
| **6 Inventory** (1 wk) | Inventory + ledger, adjustments, low stock, history; admin inventory UI | Concurrent-order test can't oversell |
| **7 Cart** (1 wk) | Server cart, guest cart + merge, preview pricing, stock validation | Cart persists across devices |
| **8 Checkout & orders** (1–2 wks) | Quote, order creation with reservation + idempotency, order history/detail/cancel, admin orders + status machine, FakeProvider "pay" | Full flow works end-to-end with FakeProvider |
| **9 Payment** (1 wk) | Razorpay orders, checkout.js, verify, webhooks, reconciliation/expiry job, refunds | Test-mode payments + webhook replay tests pass |
| **10 Admin dashboard** (1–2 wks) | KPIs, revenue trend, customers, reports, settings | Owner can run the shop without a developer |
| **11 Testing** (continuous + 1 wk hardening) | Coverage of the 16 critical flows, load smoke test, security checklist | CI green; Playwright suite on staging |
| **12 Deployment** (3–5 days) | Domains, prod/staging envs, backups, Sentry, uptime, Razorpay live keys + KYC | Go-live checklist signed off |

Admin screens for products/inventory/orders are built inside phases 5–8 alongside their APIs; phase 10 adds the dashboard/reports layer.

## T. What to build first

1. **Today:** commit the uncommitted Shop/Product changes and the untracked `src/Utils/` on a branch (they're the only copy of the Cloudinary work).
2. **Phase 1, step 1 — make the existing site correct on its own data:** unify on one product shape (the Cloudinary one), fix the cart (`NaN`), currency, pagination regression, labels, sorts, quantity, and give products real URLs. This is small, removes every "C" bug, and the same `ProductCard`/`useCart` boundaries become the seams where API data plugs in.
3. **Phase 1, step 2 — performance & 3D:** compress the model, lazy-load the hero, resize the 7 MB of collection photos, Cloudinary transformations. Biggest user-visible win per hour.
4. **Then Phase 2→5 (backend foundation → schema → auth → catalogue API)** — catalogue first because every later feature (cart, inventory, orders, admin) hangs off products/variants.

Payments come after orders work end-to-end with the FakeProvider, so Razorpay integration is a contained change.

---

## Appendix A — 3D model optimisation

Measured: `scene.gltf` + `scene.bin` = 5.66 MB, 4 meshes, 141,949 vertices / 97,941 triangles, no textures, no compression.

1. Optimise offline: `npx @gltf-transform/cli optimize scene.gltf glasses.glb --compress meshopt --simplify` (or `--compress draco`), check visually, iterate on simplify ratio. Expected: well under 1 MB (verify after running). Load with drei `useGLTF(url, true /*draco*/ )` or meshopt.
2. Lazy-load: `const Hero3D = lazy(() => import('./Hero3D'))` with a same-size static poster image as fallback → three.js leaves the main bundle; no blank box.
3. Reserve space: hero uses explicit heights per breakpoint / `aspect-ratio`; canvas fills its box (`width:100%; height:100%`) → no overflow, no layout shift.
4. Fit model to canvas: drei `<Bounds fit clip observe>` or `<Center>` + scale from `useThree(s => s.viewport)`; delete the `window.innerWidth` effect.
5. Render only when visible: IntersectionObserver → `frameloop={visible ? 'always' : 'never'}`; `dpr={[1, 1.75]}`; drop `castShadow/receiveShadow`; respect `prefers-reduced-motion` (no auto-rotate).
6. Mobile: don't attach `OrbitControls` on touch devices (auto-rotate only) or require an explicit "rotate" toggle, so vertical swipes scroll the page.
7. Colour buttons: tint only the frame materials (`Material.001`, `glass.001`), clone materials instead of mutating the cache, give buttons `aria-label`s and a selected state.
8. Fallbacks: ErrorBoundary + WebGL-support check → poster image.
9. Licence: add "‘Eyewear (Specs)’ by rojencha (Sketchfab), CC BY 4.0" with links in the footer/credits.
10. Deployment: serve from `/models/glasses.<hash>.glb` with long `Cache-Control`; Netlify serves static files before the SPA redirect. Delete `public/shirt_baked_2.glb`.

## Appendix B — Testing plan

Backend (pytest, real PostgreSQL test DB, each test in a rolled-back transaction):
- Unit: pricing (MRP/discount/shipping/GST-inclusive split), order state machine, token rotation, signature verification.
- Service/integration: order creation reserves stock; **two concurrent orders for the last unit → exactly one succeeds** (threads + separate sessions); expiry releases stock; payment captured twice (verify + webhook) → one SALE.
- API: auth flows, 401/403 matrix for every `/admin` route (generated test), validation errors, pagination.
Frontend: Vitest + RTL for `useCart`, filter↔URL sync, VariantSelector, forms; MSW for API mocks.
E2E (Playwright on staging with FakeProvider/Razorpay test mode): the 16 flows listed in the brief (registration → payment).
CI: GitHub Actions — ruff + pytest (Postgres service container) + ESLint + Vitest on every PR; Playwright nightly/on release.

## Appendix C — Environments & configuration

| | Development | Staging | Production |
|---|---|---|---|
| Frontend | `vite` dev server (proxies `/api`) | Vercel preview deployment | Vercel production |
| API | `uvicorn --reload` | Vercel preview deployment | Vercel production |
| DB | local Postgres | separate managed DB (or Neon branch) | managed DB with backups |
| Cloudinary | folder `dev/` | folder `staging/` | `Products/` (existing) |
| Payments | FakeProvider | Razorpay **test** keys | Razorpay **live** keys |
| Email | console/log | real provider, sandbox | real provider |

Backend env vars: `APP_ENV, DATABASE_URL, JWT_SECRET, ACCESS_TOKEN_TTL_MINUTES, REFRESH_TOKEN_TTL_DAYS, FRONTEND_URL, CORS_ORIGINS, COOKIE_DOMAIN, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_UPLOAD_FOLDER, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, EMAIL_API_KEY, EMAIL_FROM, SENTRY_DSN, LOG_LEVEL`.
Frontend env vars (public by nature): `VITE_API_BASE_URL, VITE_CLOUDINARY_CLOUD_NAME, VITE_SENTRY_DSN`. Razorpay key id is returned by the API per payment.
Commit only `.env.example` files; secrets live in the hosting dashboards and GitHub Actions secrets.

## Appendix D — Migration workflow (Alembic)

1. Change a model in `app/models/`.
2. `alembic revision --autogenerate -m "add low_stock_threshold"`.
3. **Review and edit** the generated file (autogenerate misses/garbles CHECK constraints, partial indexes, computed columns, renames, data backfills).
4. `alembic upgrade head` locally; `alembic downgrade -1` + upgrade again to test reversibility.
5. Commit model + migration together; CI runs `upgrade head` on a fresh DB and the test suite.
6. Deploy: platform pre-deploy command runs `alembic upgrade head` before new code starts.
7. Rules: never edit an applied migration; never change prod schema by hand; use expand → migrate data → contract for breaking changes (add column nullable → backfill → enforce NOT NULL in a later release); take a backup before risky migrations. Seed data lives in `app/cli.py seed`, not in migrations.

## Appendix E — Logging, monitoring, backups

- JSON logs with `request_id`, user id, route, status, latency; no passwords/tokens/addresses in logs.
- Sentry for exceptions (backend + frontend) with release tags.
- `/health` (liveness) and `/health/ready` (DB + migration head) wired to the host health check and an external uptime monitor (alerts to the owner's email/WhatsApp).
- Daily managed backups + weekly `pg_dump` to separate storage; quarterly restore test into staging.
- Payment safety net: daily reconciliation job comparing Razorpay captured payments vs PAID orders, alerting on mismatches.

## Appendix F — Open questions for the shop owner

1. Online stock: is it a separate pool, or shared with the two physical stores (who updates it, how often)?
2. Shipping: flat fee? free above ₹15,000 (as the site claims)? Delivery regions (pan-India or Bengaluru)? Courier?
3. GST: registration, HSN codes and rates per category (rates for spectacles/frames changed in Sept 2025 — confirm with the shop's CA); invoices needed?
4. Returns/refunds/cancellation policy and window (the site claims 30-day money back — true?).
5. COD: required? (Common in India; adds RTO risk.)
6. Product catalogue scope at launch: only Ray-Ban sunglasses (current data) or eyeglass frames/contact lenses/accessories too? Who photographs and uploads?
7. Correct public contact details (phone, email, WhatsApp) — the site currently shows conflicting values.
8. Domain name owned? Email domain for transactional mail?
9. Brand logos in "Company Partners" and Ray-Ban product imagery — are they authorised retailer assets?
10. Is the "Winter Sale up to 60%" banner, "24/7 support" real?
