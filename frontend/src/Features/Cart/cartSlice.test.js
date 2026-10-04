import { configureStore } from "@reduxjs/toolkit";
import cartReducer, {
  addToCart,
  clearCart,
  MAX_QUANTITY,
  removeFromCart,
  selectCartCount,
  selectCartLines,
  selectCartSubtotalPaise,
  updateQuantity,
} from "./cartSlice";

const makeStore = () => configureStore({ reducer: { cart: cartReducer } });

const HAVANA = {
  sku: "ORB4349-HAVANA",
  slug: "ray-ban-rb4349",
  name: "Ray-Ban RB4349",
  colorName: "Havana",
  pricePaise: 719000,
  image: { public_id: "Products/orb4349_havana/orb4349_havana_1", version: 1775294749 },
};
const BLACK = { ...HAVANA, sku: "ORB2132", slug: "ray-ban-new-wayfarer-rb2132", pricePaise: 1249000 };

describe("cart slice", () => {
  test("adds a colour with the requested quantity", () => {
    const store = makeStore();
    store.dispatch(addToCart({ ...HAVANA, quantity: 3 }));
    expect(store.getState().cart.items).toEqual([{ ...HAVANA, quantity: 3 }]);
  });

  test("adding the same colour again merges quantities and refreshes the snapshot", () => {
    const store = makeStore();
    store.dispatch(addToCart(HAVANA));
    store.dispatch(addToCart({ ...HAVANA, pricePaise: 699000, quantity: 2 }));
    expect(store.getState().cart.items).toEqual([{ ...HAVANA, pricePaise: 699000, quantity: 3 }]);
  });

  test("caps quantity at the per-item limit", () => {
    const store = makeStore();
    store.dispatch(addToCart({ ...HAVANA, quantity: 25 }));
    expect(store.getState().cart.items[0].quantity).toBe(MAX_QUANTITY);
  });

  test("updates, ignores invalid quantities and removes", () => {
    const store = makeStore();
    store.dispatch(addToCart(HAVANA));
    store.dispatch(updateQuantity({ sku: HAVANA.sku, quantity: 4 }));
    store.dispatch(updateQuantity({ sku: HAVANA.sku, quantity: NaN }));
    store.dispatch(updateQuantity({ sku: HAVANA.sku, quantity: 0 }));
    expect(store.getState().cart.items[0].quantity).toBe(1);
    store.dispatch(removeFromCart(HAVANA.sku));
    expect(store.getState().cart.items).toEqual([]);
  });

  test("totals are computed in paise", () => {
    const store = makeStore();
    store.dispatch(addToCart({ ...HAVANA, quantity: 2 }));
    store.dispatch(addToCart(BLACK));
    const state = store.getState();
    expect(selectCartCount(state)).toBe(3);
    expect(selectCartSubtotalPaise(state)).toBe(2 * 719000 + 1249000);
    expect(selectCartLines(state)[0].lineTotalPaise).toBe(1438000);
    store.dispatch(clearCart());
    expect(selectCartCount(store.getState())).toBe(0);
  });
});
