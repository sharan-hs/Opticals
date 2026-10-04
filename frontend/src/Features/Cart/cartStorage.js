import { MAX_QUANTITY } from "./cartSlice";

// v2: lines are colours (SKUs) from the API. Carts saved by the old static
// catalogue (v1) can't be mapped reliably and are discarded.
const STORAGE_KEY = "vijai-cart-v2";
const OLD_KEYS = ["vijai-cart-v1"];

const isValidLine = (item) =>
  typeof item?.sku === "string" &&
  typeof item.slug === "string" &&
  typeof item.name === "string" &&
  Number.isInteger(item.pricePaise) &&
  item.pricePaise > 0 &&
  Number.isInteger(item.quantity) &&
  item.quantity >= 1;

// Reads the saved cart, dropping anything malformed.
export const loadCart = () => {
  try {
    OLD_KEYS.forEach((key) => localStorage.removeItem(key));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved?.items)) return undefined;
    const items = saved.items
      .filter(isValidLine)
      .map((item) => ({ ...item, quantity: Math.min(item.quantity, MAX_QUANTITY) }));
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
