import { configureStore } from "@reduxjs/toolkit";

import { baseApi } from "../Api/baseApi";
import authReducer from "../Features/Auth/authSlice";
import cartSlice from "../Features/Cart/cartSlice";
import { loadCart, saveCart } from "../Features/Cart/cartStorage";

// Exported for tests, which build a fresh store each time.
export const makeStore = (preloadedState) =>
  configureStore({
    reducer: {
      auth: authReducer,
      cart: cartSlice,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
    preloadedState,
  });

const savedCart = loadCart();
const store = makeStore(savedCart ? { cart: savedCart } : undefined);

let lastSavedCart = store.getState().cart;
store.subscribe(() => {
  const { cart } = store.getState();
  if (cart !== lastSavedCart) {
    lastSavedCart = cart;
    saveCart(cart);
  }
});

export default store;
