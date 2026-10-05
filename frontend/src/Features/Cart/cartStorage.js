import { MAX_QUANTITY } from "./cartSlice";

// v3: { variant_id, quantity } only. Earlier versions stored a display
// snapshot (v2) or static-catalogue ids (v1); they're discarded.
const STORAGE_KEY = "vijai-cart-v3";
const OLD_KEYS = ["vijai-cart-v1", "vijai-cart-v2"];

const isValidLine = (item) =>
  Number.isInteger(item?.variant_id) &&
  item.variant_id > 0 &&
  Number.isInteger(item.quantity) &&
  item.quantity >= 1;

// Reads the saved guest cart, dropping anything malformed.
export const loadCart = () => {
  try {
    OLD_KEYS.forEach((key) => localStorage.removeItem(key));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved?.items)) return undefined;
    const items = saved.items
      .filter(isValidLine)
      .map(({ variant_id, quantity }) => ({ variant_id, quantity: Math.min(quantity, MAX_QUANTITY) }));
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
