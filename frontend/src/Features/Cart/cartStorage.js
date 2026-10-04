import { getProductById } from "../../Data/catalog";
import { MAX_QUANTITY } from "./cartSlice";

const STORAGE_KEY = "vijai-cart-v1";

// Reads the saved cart, dropping anything malformed or no longer sold.
export const loadCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved?.items)) return undefined;

    const items = saved.items
      .filter(
        (item) =>
          getProductById(item?.id) &&
          Number.isInteger(item.quantity) &&
          item.quantity >= 1
      )
      .map((item) => ({
        id: item.id,
        quantity: Math.min(item.quantity, MAX_QUANTITY),
      }));
    return { items };
  } catch {
    return undefined;
  }
};

export const saveCart = (cart) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: cart.items }));
  } catch {
    // Storage full or blocked (private mode): the cart still works in memory.
  }
};
