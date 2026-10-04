import { configureStore } from "@reduxjs/toolkit";
import cartReducer, {
  addToCart,
  clearCart,
  MAX_QUANTITY,
  removeFromCart,
  selectCartCount,
  selectCartLines,
  selectCartSubtotal,
  updateQuantity,
} from "./cartSlice";
import { getProductById } from "../../Data/catalog";

const makeStore = () => configureStore({ reducer: { cart: cartReducer } });

describe("cart slice", () => {
  test("adds a product with the requested quantity", () => {
    const store = makeStore();
    store.dispatch(addToCart({ id: "orb2132", quantity: 3 }));
    expect(store.getState().cart.items).toEqual([{ id: "orb2132", quantity: 3 }]);
  });

  test("adding the same product again merges quantities", () => {
    const store = makeStore();
    store.dispatch(addToCart({ id: "orb2132" }));
    store.dispatch(addToCart({ id: "orb2132", quantity: 2 }));
    expect(store.getState().cart.items).toEqual([{ id: "orb2132", quantity: 3 }]);
  });

  test("caps quantity at the per-item limit", () => {
    const store = makeStore();
    store.dispatch(addToCart({ id: "orb2132", quantity: MAX_QUANTITY + 5 }));
    store.dispatch(addToCart({ id: "orb2132", quantity: 1 }));
    expect(store.getState().cart.items[0].quantity).toBe(MAX_QUANTITY);
  });

  test("updateQuantity clamps to 1..MAX and ignores non-numbers", () => {
    const store = makeStore();
    store.dispatch(addToCart({ id: "orb2132", quantity: 2 }));
    store.dispatch(updateQuantity({ id: "orb2132", quantity: 99 }));
    expect(store.getState().cart.items[0].quantity).toBe(MAX_QUANTITY);
    store.dispatch(updateQuantity({ id: "orb2132", quantity: 0 }));
    expect(store.getState().cart.items[0].quantity).toBe(1);
    store.dispatch(updateQuantity({ id: "orb2132", quantity: NaN }));
    expect(store.getState().cart.items[0].quantity).toBe(1);
  });

  test("removes and clears items", () => {
    const store = makeStore();
    store.dispatch(addToCart({ id: "orb2132" }));
    store.dispatch(addToCart({ id: "orb3447" }));
    store.dispatch(removeFromCart("orb2132"));
    expect(store.getState().cart.items.map((i) => i.id)).toEqual(["orb3447"]);
    store.dispatch(clearCart());
    expect(store.getState().cart.items).toEqual([]);
  });

  test("selectors price lines from the catalogue", () => {
    const store = makeStore();
    store.dispatch(addToCart({ id: "orb2132", quantity: 2 }));
    store.dispatch(addToCart({ id: "orb4349_brown", quantity: 1 }));
    const state = store.getState();
    const expected =
      getProductById("orb2132").price * 2 + getProductById("orb4349_brown").price;

    expect(selectCartLines(state)).toHaveLength(2);
    expect(selectCartCount(state)).toBe(3);
    expect(selectCartSubtotal(state)).toBe(expected);
    expect(Number.isFinite(selectCartSubtotal(state))).toBe(true);
  });

  test("lines for products no longer in the catalogue are ignored", () => {
    const state = { cart: { items: [{ id: "discontinued", quantity: 1 }] } };
    expect(selectCartLines(state)).toEqual([]);
    expect(selectCartSubtotal(state)).toBe(0);
  });
});
