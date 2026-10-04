# Phase 1 (frontend) — what to test

Branch: `phase1/frontend-cleanup` (changes are uncommitted in the working tree until you've tested).

## Run it

```bash
cd frontend
npm install          # dependencies changed (CRA removed, Vite added)
npm run dev          # http://localhost:3000   (stop any old `npm start` first)
npm test             # 32 unit tests
npm run lint         # should print nothing
npm run build && npm run preview   # production build on http://localhost:3000
```

Use Chrome DevTools device mode to try phone (390 px), tablet (768 px) and laptop (1366 px) widths.

## Checklist

### Shop → cart (the old `$NaN` bug)
- [ ] `/shop` → "Add to Cart" on any card → toast → header bag badge shows 1
- [ ] Cart shows image, name, colour, **₹** price, line total and subtotal (no `$`, no `NaN`)
- [ ] Change quantity with − / + and by typing; can't go below 1 or above 10
- [ ] Remove an item; empty cart shows "Your cart is empty" + Shop Now
- [ ] Reload the page: cart is still there
- [ ] "Proceed to Checkout" shows the "online checkout is launching soon" notice with store phone numbers (no fake "order completed")

### Product pages
- [ ] Click any product (Home grid, Shop, Related products) → opens `/products/<name>`
- [ ] Copy that URL into a new tab → same product loads (used to say "No product found")
- [ ] `/products/anything-wrong` → "Product not found" with a link back to the shop
- [ ] Gallery thumbnails and ‹ › arrows; RB3119M / RB3735 show 5 images with no broken 6th
- [ ] RB4349, Balorama and Wayfarer Puffer show colour swatches that switch between colours
- [ ] Choose quantity 3 → Add to Cart → cart shows 3
- [ ] Product Details table (brand, model, colour, category, code) — no lorem ipsum, no fake reviews

### Shop filters
- [ ] Category, colour, brand and price filters work; chips appear above results and remove filters
- [ ] Search box in the shop and the header search (desktop 🔍 and mobile menu) → `/shop?q=…`
- [ ] Filters are in the URL: reload or use Back and they stay
- [ ] Filter that matches nothing → empty state with "Clear all filters"
- [ ] Sort: price low→high / high→low / A–Z / Z–A
- [ ] Phone width: "Filter" opens a drawer, "Show N results" / ✕ / Esc / tapping outside closes it
- [ ] Cards: all sunglasses say "Sunglasses" (used to say "Reading Glasses")

### Home & 3D model
- [ ] Spinner briefly, then the glasses rotate; colour dots change the frame (lenses stay clear)
- [ ] Phone: the glasses are a sensible size and swiping over them scrolls the page
- [ ] Desktop: drag rotates the glasses
- [ ] Other pages don't download the model (DevTools → Network → `glasses.glb` only on Home, ~114 KB)

### Header, footer, other pages
- [ ] Phone: open menu → tap cart icon → menu closes and the page scrolls (used to stay locked)
- [ ] Footer: two store phone numbers (tap-to-call), email, policy links, 3D model credit
- [ ] About: no sideways scroll at laptop width; no fashion-brand logos
- [ ] Contact: two maps, addresses; "Send Email" opens your mail app pre-filled
- [ ] Login / Register / Reset: submitting shows "accounts are coming soon" (no page reload)
- [ ] `/terms`, `/privacy-policy`, `/refund-policy`, `/shipping-policy` load
- [ ] Keyboard: Tab through header, cards, filters, cart — focus outline visible everywhere

## Things that are deliberately not done yet

- No real checkout, accounts or payments — that's the backend phases (2–9).
- Hero/services copy is neutral placeholder text; claims like "free delivery", "24/7 support", "60% off" were removed until the owner confirms them.
- Women/Men/Kids tiles link to the whole shop (products have no gender data yet).
- Policy pages are drafts describing today's no-online-orders setup; the owner (and ideally a lawyer/CA) must review them before payments go live.
- Contact email, social links and phone numbers need the owner's confirmation (`src/Config/storeInfo.js`).
- Vite is on v5 because this Mac has Node 18; install Node 22 LTS, then upgrade to Vite 7.

## Owner questions blocking later phases

See `docs/TASKS.md` Phase 0.4 (stock, shipping, GST, returns, COD, catalogue, contacts, domain, Razorpay account holder).
