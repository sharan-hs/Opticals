import React from "react";
import { Route } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import CheckoutPage from "../../Components/Checkout/CheckoutPage";
import OrderPage from "../../Components/Orders/OrderPage";
import { API, server } from "../../test/server";
import { renderApp, signedIn } from "../../test/render";

const LINE = {
  variant_id: 11,
  sku: "ORB4349-HAVANA",
  color_name: "Havana",
  product_slug: "ray-ban-rb4349",
  product_name: "Ray-Ban RB4349",
  image: null,
  quantity: 1,
  unit_price_paise: 719000,
  mrp_paise: 719000,
  line_total_paise: 719000,
  max_quantity: 3,
  issue: null,
};

const quote = (total = 719000) => ({
  lines: [{ ...LINE, line_total_paise: total, unit_price_paise: total }],
  item_count: 1,
  subtotal_paise: total,
  delivery_fee_paise: 0,
  total_paise: total,
  savings_paise: 0,
  has_issues: false,
  options: {
    upi: { enabled: true, payment_window_minutes: 30 },
    pay_at_store: { enabled: true, hold_days: 3 },
    stores: [{ id: "vijayanagar", name: "Vijayanagar", address: "8th Main Rd", phone: "080 2340 7691" }],
    delivery_fee_paise: 0,
  },
});

const ADDRESS = {
  id: 5,
  label: "Home",
  full_name: "Asha Rao",
  phone: "+919876543210",
  line1: "1 Test Road",
  line2: null,
  landmark: null,
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560079",
  is_default: true,
};

const order = (overrides = {}) => ({
  order_number: "VO-261005-0001",
  status: "PENDING_PAYMENT",
  payment_status: "UNPAID",
  payment_method: "UPI",
  fulfilment: "DELIVERY",
  placed_at: "2026-10-05T10:00:00Z",
  total_paise: 719000,
  item_count: 1,
  first_item_name: "Ray-Ban RB4349",
  first_item_image: null,
  items: [
    {
      variant_id: 11,
      product_name: "Ray-Ban RB4349",
      variant_label: "Havana",
      sku: "ORB4349-HAVANA",
      image_public_id: null,
      unit_mrp_paise: 719000,
      unit_price_paise: 719000,
      quantity: 1,
      line_total_paise: 719000,
    },
  ],
  subtotal_paise: 719000,
  delivery_fee_paise: 0,
  tax_paise: 109678,
  shipping_address: ADDRESS,
  pickup_store: null,
  customer_note: null,
  expires_at: new Date(Date.now() + 25 * 60000).toISOString(),
  paid_at: null,
  shipped_at: null,
  delivered_at: null,
  cancelled_at: null,
  cancel_reason: null,
  courier_name: null,
  tracking_number: null,
  tracking_url: null,
  timeline: [{ status: "PENDING_PAYMENT", at: "2026-10-05T10:00:00Z" }],
  upi: {
    upi_id: "vijaiopticians@example",
    payee_name: "Vijai Opticians",
    amount_paise: 719000,
    upi_uri: "upi://pay?pa=vijaiopticians%40example&am=7190.00",
    pay_by: new Date(Date.now() + 25 * 60000).toISOString(),
    reference_submitted: null,
  },
  can_cancel: true,
  ...overrides,
});

const routes = (
  <>
    <Route path="/checkout" element={<CheckoutPage />} />
    <Route path="/orders/:orderNumber" element={<OrderPage />} />
  </>
);

describe("checkout", () => {
  it("places a UPI order with an idempotency key and opens the order", async () => {
    let placed = null;
    server.use(
      http.post(`${API}/checkout/quote`, () => HttpResponse.json(quote())),
      http.get(`${API}/me/addresses`, () => HttpResponse.json([ADDRESS])),
      http.post(`${API}/orders`, async ({ request }) => {
        placed = { key: request.headers.get("Idempotency-Key"), body: await request.json() };
        return HttpResponse.json(order(), { status: 201 });
      }),
      http.get(`${API}/orders/VO-261005-0001`, () => HttpResponse.json(order()))
    );
    renderApp(routes, { path: "/checkout", preloadedState: signedIn() });

    expect(await screen.findByText("Home delivery · pay now by UPI")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("radio", { name: /Asha Rao/ })).toBeChecked());
    await userEvent.click(screen.getByRole("button", { name: /Place order/ }));

    expect(await screen.findByText("Pay ₹7,190 by UPI")).toBeInTheDocument();
    expect(placed.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(placed.body).toEqual({
      payment_method: "UPI",
      address_id: 5,
      store_id: null,
      customer_note: null,
      expected_total_paise: 719000,
    });
    expect(screen.getByText("Thank you! Your order is placed. We’ve emailed the details.")).toBeInTheDocument();
  });

  it("pay at store asks for a store, and a price change is explained", async () => {
    let quotes = 0;
    const keys = new Set();
    server.use(
      http.post(`${API}/checkout/quote`, () => {
        quotes += 1;
        return HttpResponse.json(quote(quotes === 1 ? 719000 : 749000));
      }),
      http.get(`${API}/me/addresses`, () => HttpResponse.json([ADDRESS])),
      http.post(`${API}/orders`, ({ request }) => {
        keys.add(request.headers.get("Idempotency-Key"));
        return HttpResponse.json(
          { error: { code: "PRICE_CHANGED", message: "Prices changed since you opened checkout." }, request_id: "t" },
          { status: 409 }
        );
      })
    );
    renderApp(routes, { path: "/checkout", preloadedState: signedIn() });

    await userEvent.click(await screen.findByRole("radio", { name: /Pick up at our store/ }));
    const place = screen.getByRole("button", { name: /Place order/ });
    expect(place).toBeDisabled(); // no store chosen yet
    await userEvent.click(screen.getByRole("radio", { name: /Vijayanagar/ }));
    await userEvent.click(screen.getByRole("button", { name: /Place order/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Prices changed since you opened checkout.");
    expect(await screen.findByRole("button", { name: "Place order · ₹7,490" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: /Place order/ }));
    await waitFor(() => expect(keys.size).toBe(1)); // retries reuse the same key
  });
});

describe("order page", () => {
  it("shows the UPI details and records the payment reference", async () => {
    let reported = null;
    server.use(
      http.get(`${API}/orders/VO-261005-0001`, () =>
        HttpResponse.json(reported ? order({ payment_status: "VERIFYING", can_cancel: false, upi: { ...order().upi, reference_submitted: reported } }) : order())
      ),
      http.post(`${API}/orders/VO-261005-0001/payment`, async ({ request }) => {
        reported = (await request.json()).reference;
        return HttpResponse.json(order({ payment_status: "VERIFYING" }));
      })
    );
    renderApp(routes, { path: "/orders/VO-261005-0001", preloadedState: signedIn() });

    expect(await screen.findByText("vijaiopticians@example")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pay with a UPI app" })).toHaveAttribute(
      "href",
      "upi://pay?pa=vijaiopticians%40example&am=7190.00"
    );
    const iPaid = screen.getByRole("button", { name: "I’ve paid" });
    expect(iPaid).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Paid\? Enter the UPI reference number/), "4123 4567 8901");
    await userEvent.click(iPaid);

    expect(await screen.findByText("Thank you! We’re checking your payment")).toBeInTheDocument();
    expect(reported).toBe("412345678901");
    expect(screen.queryByRole("button", { name: "Cancel this order" })).not.toBeInTheDocument();
  });
});
