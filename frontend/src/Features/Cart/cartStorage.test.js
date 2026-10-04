import { loadCart, saveCart } from "./cartStorage";

const KEY = "vijai-cart-v1";

beforeEach(() => localStorage.clear());

test("round-trips a saved cart", () => {
  saveCart({ items: [{ id: "orb2132", quantity: 2 }] });
  expect(loadCart()).toEqual({ items: [{ id: "orb2132", quantity: 2 }] });
});

test("returns undefined when nothing or garbage is stored", () => {
  expect(loadCart()).toBeUndefined();
  localStorage.setItem(KEY, "{not json");
  expect(loadCart()).toBeUndefined();
});

test("drops unknown products and invalid quantities", () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      items: [
        { id: "orb2132", quantity: 50 },
        { id: "unknown", quantity: 1 },
        { id: "orb3447", quantity: -2 },
        { id: "orb3735", quantity: "3" },
      ],
    })
  );
  expect(loadCart()).toEqual({ items: [{ id: "orb2132", quantity: 10 }] });
});
