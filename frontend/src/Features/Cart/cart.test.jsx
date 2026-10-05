import React from "react";
import { Route } from "react-router-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import ShoppingCart from "../../Components/ShoppingCart/ShoppingCart";
import { cartApi } from "./cartApi";
import { applyGuestQuantities, useCartSync } from "./useCart";
import { API, server } from "../../test/server";
import { renderApp, signedIn } from "../../test/render";

const line = (overrides = {}) => ({
  variant_id: 11,
  sku: "ORB4349-HAVANA",
  color_name: "Havana",
  product_slug: "ray-ban-rb4349",
  product_name: "Ray-Ban RB4349",
  image: null,
  quantity: 1,
  unit_price_paise: 719000,
  mrp_paise: 790000,
  line_total_paise: 719000,
  max_quantity: 5,
  issue: null,
  ...overrides,
});

const cartOf = (lines) => applyGuestQuantities({ lines }, lines);

const guest = (items) => ({
  auth: { status: "anonymous", accessToken: null, user: null },
  cart: { items },
});

// The lines are shown twice (desktop table and mobile list); tests use the table.
const linesTable = async () => {
  await screen.findAllByText("Ray-Ban RB4349");
  return document.querySelector(".shoppingBagTable");
};

const SyncHarness = () => {
  useCartSync();
  return <p>App</p>;
};

describe("guest cart", () => {
  it("is priced by the API, and a stock problem can be fixed in one click", async () => {
    const requests = [];
    server.use(
      http.post(`${API}/cart/preview`, async ({ request }) => {
        const { items } = await request.json();
        requests.push(items);
        // Pretend 11 has 1 left and 99 no longer exists.
        return HttpResponse.json(
          cartOf(
            items
              .filter((item) => item.variant_id === 11)
              .map((item) =>
                line({ quantity: item.quantity, max_quantity: 1, line_total_paise: 719000 * item.quantity })
              )
          )
        );
      })
    );
    const app = (
      <>
        <SyncHarness />
        <ShoppingCart />
      </>
    );
    const { store } = renderApp(<Route path="/cart" element={app} />, {
      path: "/cart",
      preloadedState: guest([
        { variant_id: 11, quantity: 3 },
        { variant_id: 99, quantity: 1 },
      ]),
    });

    const table = await linesTable();
    expect(within(table).getByText("Ray-Ban RB4349")).toBeInTheDocument();
    expect(within(table).getByText("Only 1 left.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proceed to Checkout" })).toBeDisabled();

    await userEvent.click(within(table).getByRole("button", { name: "Change to 1" }));
    expect(store.getState().cart.items).toEqual([{ variant_id: 11, quantity: 1 }]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Proceed to Checkout" })).toBeEnabled());
    expect(screen.getByText("You save")).toBeInTheDocument();
    expect(requests[0]).toEqual([
      { variant_id: 11, quantity: 3 },
      { variant_id: 99, quantity: 1 },
    ]);
  });
});

describe("signing in", () => {
  it("merges the guest cart into the server cart and empties it", async () => {
    let merged = null;
    server.use(
      http.post(`${API}/cart/merge`, async ({ request }) => {
        merged = (await request.json()).items;
        return HttpResponse.json({ ...cartOf([line({ quantity: 2, line_total_paise: 1438000 })]), adjusted_variant_ids: [] });
      })
    );
    const { store } = renderApp(<Route path="/" element={<SyncHarness />} />, {
      preloadedState: { ...signedIn(), cart: { items: [{ variant_id: 11, quantity: 2 }] } },
    });

    await waitFor(() => expect(store.getState().cart.items).toEqual([]));
    expect(merged).toEqual([{ variant_id: 11, quantity: 2 }]);
    const cached = cartApi.endpoints.getCart.select()(store.getState());
    expect(cached.data.item_count).toBe(2);
  });
});

describe("signed-in cart", () => {
  it("rolls a refused quantity change back", async () => {
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json(cartOf([line()]))),
      http.patch(`${API}/cart/items/11`, () =>
        HttpResponse.json(
          { error: { code: "INSUFFICIENT_STOCK", message: "Only 1 left in stock." }, request_id: "t" },
          { status: 409 }
        )
      )
    );
    renderApp(<Route path="/cart" element={<ShoppingCart />} />, { path: "/cart", preloadedState: signedIn() });

    const table = await linesTable();
    const quantity = within(table).getByLabelText("Quantity of Ray-Ban RB4349");
    expect(quantity).toHaveValue(1);
    await userEvent.click(within(table).getByRole("button", { name: "Increase quantity of Ray-Ban RB4349" }));
    await waitFor(() => expect(quantity).toHaveValue(1));
    expect(within(table).getByText("Ray-Ban RB4349")).toBeInTheDocument();
  });
});

describe("applyGuestQuantities", () => {
  it("recomputes totals and stock issues from local quantities", () => {
    const preview = cartOf([line({ quantity: 1 }), line({ variant_id: 12, issue: "INACTIVE", max_quantity: 0 })]);
    const cart = applyGuestQuantities(preview, [
      { variant_id: 11, quantity: 6 },
      { variant_id: 12, quantity: 1 },
    ]);
    expect(cart.lines[0]).toMatchObject({ quantity: 6, issue: "INSUFFICIENT_STOCK", line_total_paise: 4314000 });
    expect(cart.lines[1].issue).toBe("INACTIVE");
    expect(cart).toMatchObject({ item_count: 7, subtotal_paise: 0, has_issues: true });

    const fixed = applyGuestQuantities(preview, [{ variant_id: 11, quantity: 2 }]);
    expect(fixed).toMatchObject({ item_count: 2, subtotal_paise: 1438000, savings_paise: 142000, has_issues: false });
  });
});
