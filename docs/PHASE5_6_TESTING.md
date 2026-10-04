# Phases 5–6 (catalogue on the API, admin, stock): what to check

Branch: `phase2/backend-foundation`. Run both apps:

```bash
cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app --reload
cd frontend && npm install && npm run dev        # http://localhost:3000
```

The shop now reads everything from the database. Stock starts at **0**, so every product shows "Out of stock" until you add stock in the admin (step 2).

## 1. Become an admin
```bash
cd backend && uv run python -m app.cli create-admin
```
- [ ] Log in at http://localhost:3000/login with that account → the header person menu shows **Shop admin**
- [ ] http://localhost:3000/admin opens the admin (no shop header/footer); a normal customer account gets "You don't have access"

## 2. Stock (Phase 6)
- [ ] Admin → **Stock**: every colour is listed with On hand / Reserved / Available / Alert at
- [ ] **Adjust** a colour → Restock 10 → the dialog previews "On hand will be 10" → Save; status becomes **In stock**
- [ ] Adjust → "Damaged / lost" without a note → refused ("Add a note…"); with a note it saves
- [ ] Set the "Low-stock alert at" level above the stock → status **Low**; the sidebar "Stock" counter shows how many are low/out
- [ ] **History** on a row shows each change, who made it and the note
- [ ] **Stock history** page: filter by type and dates
- [ ] **Mark out of stock** (with a note) sets Available to 0

## 3. Products (Phase 5)
- [ ] **Products** list: search by name/model/SKU; filter by category, brand, status, stock
- [ ] **Add product** → fill details + first colour (MRP, selling price, opening stock) → Create
- [ ] **Photos** tab: uploading needs the shop's Cloudinary API key (see below). Meanwhile "Add by ID" attaches an image already in Cloudinary, e.g. `Products/orb2132/orb2132_3` from an existing product
- [ ] **Colours & stock** tab: add a second colour; change a price; selling price above MRP is refused
- [ ] **Specifications** tab: add "Lens width · 54 mm"; it appears in the product page's details table
- [ ] **Hide from shop** / **Publish** / **Delete** (with confirmation)
- [ ] **Categories**: add a subcategory, rename, untick "Shown"; deleting a category with products is refused
- [ ] **Brands**: add one; duplicate names (any capitalisation) are refused

## 4. The shop
- [ ] `/shop`: filters (category, colour, brand, frame shape, price, **In stock only**) and their counts come from the database; search tolerates typos (`balorma`)
- [ ] Cards: "N colours", "From ₹…", strike-through MRP and "% off" when discounted, **Out of stock / Only a few left** badges
- [ ] Product page: colour dots switch photos and price (`?variant=SKU` in the URL); sold-out colours are struck through and "Add to Cart" is disabled
- [ ] Old product links still work, e.g. http://localhost:3000/products/ray-ban-rb4349-havana opens RB4349 with Havana selected
- [ ] Add to cart → the cart shows colour, price and totals. (The cart keeps a copy of price/photo until Phase 7 prices it on the server; carts from the old site version are cleared once.)
- [ ] Changes in the admin show up in the shop on the next page load

## Cloudinary uploads (needs the owner)
Uploading photos from the admin needs the API key and secret of the shop's Cloudinary account, in `backend/.env`:
```
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
```
Uploads go to `uploads/products/<product>/`. Deleting a photo in the admin removes uploaded files from Cloudinary but never touches the original `Products/` images.

## Not in these phases
- Cart on the server, checkout, orders, payments: Phases 7–9 (that's when stock is reserved and sold automatically).
- Dashboard, orders and customer admin pages: Phases 8 and 10.
