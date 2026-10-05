# Phase 8 (checkout and orders): what to check

Branch: `phase2/backend-foundation`. Run both apps:

```bash
cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app --reload
cd frontend && npm install && npm run dev        # http://localhost:3000
```

`alembic upgrade head` is needed once: it adds how each order is paid and handed over.

**Before you start:**
- Give a few colours some stock in **Admin → Stock**.
- Use two browsers (or a normal and a private window): one signed in as a customer, one as the admin.

## How paying works for now
| Customer picks | What happens |
|---|---|
| **Home delivery · pay now by UPI** (free delivery) | The order holds the stock for 30 minutes and shows a QR code, a "Pay with a UPI app" button, the shop's UPI ID and the amount. After paying, the customer types the UPI reference and taps **I've paid**. The shop checks its bank or UPI app and presses **Confirm payment received**. Only then is the stock counted as sold. |
| **Pick up at our store · pay there** | The stock is held for 3 days. When the customer comes in and pays, the shop presses **Collected and paid**. |

If an order isn't paid or collected in time, it cancels itself and the stock goes back on sale. If the customer has reported a payment, the order never cancels itself; the shop decides.

## 1. Settings (admin)
- [ ] **Admin → Settings** warns that **no UPI ID is set yet**. Customers then see `vijaiopticians@example`, which can't receive money.
- [ ] Enter the owner's UPI ID (e.g. `9731307237@ybl`) and the payee name → **Save settings**. Scan the test QR with a UPI app: it should show the owner's name. **Don't pay.**
- [ ] Change the time to pay, the pickup hold days or the delivery fee, then check the checkout wording follows.
- [ ] Switching both payment options off is refused.

## 2. Customer: UPI order
- [ ] Add frames to the cart → **Proceed to Checkout**. If you're not signed in, you're asked to log in first, and your cart comes with you.
- [ ] Checkout shows **Home delivery · pay now by UPI** and **Pick up at our store · pay there**.
- [ ] With no saved address, the address form appears right there. Save it and it's selected.
- [ ] **Place order · ₹…** → the order page shows the QR code, the UPI ID with a Copy button, the amount, the order number for the payment note, and the time left to pay.
- [ ] On a phone, **Pay with a UPI app** opens Google Pay / PhonePe with the amount filled in. Don't complete the payment while the UPI ID is the dummy one.
- [ ] Enter any 12-digit reference → **I've paid** → "Thank you! We're checking your payment".
- [ ] The cart is now empty. **My Account → Orders** lists the order.
- [ ] The emails show in the API server's log (in development they're printed there instead of sent):
  - The customer's "Order … received", with the UPI details.
  - The shop's "New order …", sent to the address in Settings.

## 3. Admin: process it
- [ ] The sidebar **Orders** badge counts orders that need action.
- [ ] **Payments to check** shows the order with the reference the customer gave.
- [ ] Open it → **Confirm payment received** (the reference is pre-filled) → Confirmed / Paid. **Stock** shows the frames as sold.
- [ ] **Start packing** → **Mark shipped** (courier + tracking number) → **Mark delivered**. The customer's order page follows each step.
- [ ] **Payment not received** on another order cancels it and puts the stock back.
- [ ] **Cancel order** on a paid order puts the stock back and shows **Refund due**. **Refund sent** completes it.

## 4. Pay at store
- [ ] Choose **Pick up at our store**, pick a store → the order page says where to collect from and until when.
- [ ] Admin → **To be collected** → **Collected and paid** → Collected.

## 5. Things that should be refused
- [ ] Change a price in the admin while the customer is on checkout → **Place order** says prices changed and shows the new total.
- [ ] Two customers try to buy the last piece at the same time: only one order goes through.
- [ ] A customer with 3 unpaid orders can't place a 4th.
- [ ] Customers can cancel unpaid orders themselves, but not once they've reported a payment ("please call the store").
- [ ] An order left unpaid past its time shows **Cancelled: Not paid in time**, and its stock is back.
  - To try this without waiting 30 minutes, set "Time to pay" to 10 minutes in Settings.
- [ ] If money arrives after an order was cancelled, the admin can still press **Payment arrived after all**, as long as the frames are still in stock.

## Not in this phase
- Online card / UPI collection through Razorpay (Phase 9). Until then the shop checks UPI payments by hand.
- Dashboard, customer list and sales reports (Phase 10).
