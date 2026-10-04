import { configureStore } from "@reduxjs/toolkit";
import cartSlice from "../Features/Cart/cartSlice";
import { loadCart, saveCart } from "../Features/Cart/cartStorage";

const savedCart = loadCart();

const store = configureStore({
  reducer: {
    cart: cartSlice,
  },
  preloadedState: savedCart ? { cart: savedCart } : undefined,
});

let lastSavedCart = store.getState().cart;
store.subscribe(() => {
  const { cart } = store.getState();
  if (cart !== lastSavedCart) {
    lastSavedCart = cart;
    saveCart(cart);
  }
});

export default store;
