import { createSelector, createSlice } from "@reduxjs/toolkit";

export const MAX_QUANTITY = 10;

const clampQuantity = (quantity) => Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));

// The guest cart: what a shopper picked before signing in, saved in this
// browser. Only colour ids and quantities; names, photos and prices come from
// the API (POST /cart/preview), so nothing here can be stale or tampered with.
// Once the shopper signs in it's merged into their server cart and emptied.
//   items: [{ variant_id, quantity }]
const initialState = {
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    guestItemAdded(state, action) {
      const { variant_id, quantity = 1 } = action.payload;
      const existing = state.items.find((item) => item.variant_id === variant_id);
      if (existing) {
        existing.quantity = clampQuantity(existing.quantity + quantity);
      } else {
        state.items.push({ variant_id, quantity: clampQuantity(quantity) });
      }
    },
    guestQuantitySet(state, action) {
      const { variant_id, quantity } = action.payload;
      const item = state.items.find((line) => line.variant_id === variant_id);
      if (item && Number.isFinite(quantity)) {
        item.quantity = clampQuantity(quantity);
      }
    },
    guestItemRemoved(state, action) {
      state.items = state.items.filter((item) => item.variant_id !== action.payload);
    },
    // Drops colours the API no longer knows about.
    guestItemsKept(state, action) {
      const known = new Set(action.payload);
      if (state.items.some((item) => !known.has(item.variant_id))) {
        state.items = state.items.filter((item) => known.has(item.variant_id));
      }
    },
    guestCartCleared(state) {
      state.items = [];
    },
  },
});

export const { guestItemAdded, guestQuantitySet, guestItemRemoved, guestItemsKept, guestCartCleared } =
  cartSlice.actions;

export const selectGuestItems = (state) => state.cart.items;

export const selectGuestCount = createSelector([selectGuestItems], (items) =>
  items.reduce((count, item) => count + item.quantity, 0)
);

export default cartSlice.reducer;
