import { createSelector, createSlice } from "@reduxjs/toolkit";
import { getProductById } from "../../Data/catalog";

export const MAX_QUANTITY = 10;

const clampQuantity = (quantity) =>
  Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));

// Lines hold only the product id and quantity; name, price and image are
// looked up from the catalogue so they can never go stale.
const initialState = {
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action) {
      const { id, quantity = 1 } = action.payload;
      const existingItem = state.items.find((item) => item.id === id);
      if (existingItem) {
        existingItem.quantity = clampQuantity(existingItem.quantity + quantity);
      } else {
        state.items.push({ id, quantity: clampQuantity(quantity) });
      }
    },
    updateQuantity(state, action) {
      const { id, quantity } = action.payload;
      const itemToUpdate = state.items.find((item) => item.id === id);
      if (itemToUpdate && Number.isFinite(quantity)) {
        itemToUpdate.quantity = clampQuantity(quantity);
      }
    },
    removeFromCart(state, action) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } =
  cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;

export const selectCartLines = createSelector([selectCartItems], (items) =>
  items
    .map((item) => {
      const product = getProductById(item.id);
      return product && {
        product,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
      };
    })
    .filter(Boolean)
);

export const selectCartCount = createSelector([selectCartLines], (lines) =>
  lines.reduce((count, line) => count + line.quantity, 0)
);

export const selectCartSubtotal = createSelector([selectCartLines], (lines) =>
  lines.reduce((total, line) => total + line.lineTotal, 0)
);

export default cartSlice.reducer;
