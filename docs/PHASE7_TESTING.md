# Phase 7 (cart on the server): what to check

Branch: `phase2/backend-foundation`. Run both apps:

```bash
cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app --reload
cd frontend && npm install && npm run dev        # http://localhost:3000
```

Stock starts at **0**. First give two or three colours some stock in **Admin → Stock** (e.g. RB4349 Havana: 3, New Wayfarer: 5), otherwise everything is "Out of stock".

Your test cart from before this phase is emptied once (the browser now saves only colour + quantity).

## 1. As a guest (logged out)
- [ ] Product page: pick a colour and quantity 2 → **Add to Cart** → header bag shows **2**
- [ ] Shop: the quick "Add to Cart" on a one-colour product adds 1 → bag shows **3**
- [ ] `/cart`: names, photos and prices come from the shop (change a price in the admin and reload the cart: it follows)
- [ ] **+** stops at what's in stock (or 10)
- [ ] Reload the page: the cart is still there

## 2. Sign in / sign up
- [ ] Create an account (or log in) with items in the guest cart → the cart moves into the account; the bag count stays the same
- [ ] Log out → bag shows **0**. Log back in → the cart is back
- [ ] **Another browser or phone**: log in with the same account → same cart
- [ ] Add as a guest something you already have in the account, more than the stock allows → after login a notice says quantities were updated, and the quantity is lowered to the stock

## 3. When the shop changes (use the admin in another tab)
- [ ] Lower a colour's stock below what's in your cart → cart shows **"Only N left. Change to N"**, Checkout is disabled; clicking **Change to N** fixes it
- [ ] Mark a colour out of stock → **"Out of stock — please remove it"**
- [ ] **Hide from shop** a product in your cart → **"No longer available"**; remove it with ×
- [ ] Line issues aren't counted in the subtotal

## 4. Small things
- [ ] Typing a quantity applies it when you leave the field or press Enter
- [ ] With a discounted colour (selling price below MRP) the totals show **You save ₹…**
- [ ] "Proceed to Checkout" still shows the "launching soon, call the store" notice; real checkout is Phase 8

## How it works (for reference)
- Prices are never stored in the cart. Every view is priced from the database, so a changed price shows at once and a tampered price can't reach checkout.
- Adding or raising a quantity checks stock; nothing is held until an order is placed (Phase 8).
- Guest cart = colour ids + quantities in this browser, priced by `POST /api/v1/cart/preview`. After sign-in it's sent to `POST /api/v1/cart/merge` and cleared.
