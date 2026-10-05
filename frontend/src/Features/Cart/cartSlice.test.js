import { configureStore } from "@reduxjs/toolkit";
import cartReducer, {
  guestCartCleared,
  guestItemAdded,
  guestItemRemoved,
  guestItemsKept,
  guestQuantitySet,
  MAX_QUANTITY,
  selectGuestCount,
} from "./cartSlice";

const makeStore = () => configureStore({ reducer: { cart: cartReducer } });
const items = (store) => store.getState().cart.items;

describe("guest cart slice", () => {
  test("adds a colour and merges repeat adds", () => {
    const store = makeStore();
    store.dispatch(guestItemAdded({ variant_id: 7, quantity: 3 }));
    store.dispatch(guestItemAdded({ variant_id: 7 }));
    store.dispatch(guestItemAdded({ variant_id: 9, quantity: 2 }));
    expect(items(store)).toEqual([
      { variant_id: 7, quantity: 4 },
      { variant_id: 9, quantity: 2 },
    ]);
    expect(selectGuestCount(store.getState())).toBe(6);
  });

  test("caps quantity at the per-item limit", () => {
    const store = makeStore();
    store.dispatch(guestItemAdded({ variant_id: 7, quantity: 25 }));
    expect(items(store)[0].quantity).toBe(MAX_QUANTITY);
  });

  test("sets quantities, ignoring invalid ones, and removes", () => {
    const store = makeStore();
    store.dispatch(guestItemAdded({ variant_id: 7 }));
    store.dispatch(guestQuantitySet({ variant_id: 7, quantity: 4 }));
    store.dispatch(guestQuantitySet({ variant_id: 7, quantity: NaN }));
    expect(items(store)[0].quantity).toBe(4);
    store.dispatch(guestQuantitySet({ variant_id: 7, quantity: 0 }));
    expect(items(store)[0].quantity).toBe(1);
    store.dispatch(guestItemRemoved(7));
    expect(items(store)).toEqual([]);
  });

  test("keeps only colours the API still knows, and clears", () => {
    const store = makeStore();
    [1, 2, 3].forEach((id) => store.dispatch(guestItemAdded({ variant_id: id })));
    store.dispatch(guestItemsKept([1, 3]));
    expect(items(store).map((item) => item.variant_id)).toEqual([1, 3]);
    store.dispatch(guestCartCleared());
    expect(items(store)).toEqual([]);
  });
});
