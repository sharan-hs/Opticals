import { createSelector, createSlice } from "@reduxjs/toolkit";

export const MAX_QUANTITY = 10;

const clampQuantity = (quantity) =>
  Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));

// One line per colour (SKU). Name, colour, price and image are a snapshot
// taken when the item was added, for display only: the server prices the cart
// at checkout (Phase 7/8), so a stale snapshot can never be charged.
//   { sku, quantity, slug, name, colorName, pricePaise, image: {public_id, version} | null }
const initialState = {
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action) {
      const { quantity = 1, ...line } = action.payload;
      const existing = state.items.find((item) => item.sku === line.sku);
      if (existing) {
        Object.assign(existing, line); // refresh the snapshot
        existing.quantity = clampQuantity(existing.quantity + quantity);
      } else {
        state.items.push({ ...line, quantity: clampQuantity(quantity) });
      }
    },
    updateQuantity(state, action) {
      const { sku, quantity } = action.payload;
      const item = state.items.find((line) => line.sku === sku);
      if (item && Number.isFinite(quantity)) {
        item.quantity = clampQuantity(quantity);
      }
    },
    removeFromCart(state, action) {
      state.items = state.items.filter((item) => item.sku !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;

export const selectCartLines = createSelector([selectCartItems], (items) =>
  items.map((item) => ({ ...item, lineTotalPaise: item.pricePaise * item.quantity }))
);

export const selectCartCount = createSelector([selectCartItems], (items) =>
  items.reduce((count, item) => count + item.quantity, 0)
);

export const selectCartSubtotalPaise = createSelector([selectCartLines], (lines) =>
  lines.reduce((total, line) => total + line.lineTotalPaise, 0)
);

export default cartSlice.reducer;
