import { loadCart, saveCart } from "./cartStorage";

const KEY = "vijai-cart-v3";

beforeEach(() => localStorage.clear());

test("round-trips a saved cart", () => {
  saveCart({ items: [{ variant_id: 4, quantity: 2 }] });
  expect(loadCart()).toEqual({ items: [{ variant_id: 4, quantity: 2 }] });
});

test("returns undefined when nothing or garbage is stored", () => {
  expect(loadCart()).toBeUndefined();
  localStorage.setItem(KEY, "{not json");
  expect(loadCart()).toBeUndefined();
});

test("drops malformed lines, extra fields and caps quantities", () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      items: [
        { variant_id: 4, quantity: 50, pricePaise: 1 },
        { variant_id: 5, quantity: -2 },
        { variant_id: "6", quantity: 1 },
        { sku: "ORB2132", quantity: 1 },
      ],
    })
  );
  expect(loadCart()).toEqual({ items: [{ variant_id: 4, quantity: 10 }] });
});

test("discards carts saved by earlier versions of the site", () => {
  localStorage.setItem("vijai-cart-v1", JSON.stringify({ items: [{ id: "orb2132", quantity: 1 }] }));
  localStorage.setItem("vijai-cart-v2", JSON.stringify({ items: [{ sku: "ORB2132", quantity: 1 }] }));
  expect(loadCart()).toBeUndefined();
  expect(localStorage.getItem("vijai-cart-v1")).toBeNull();
  expect(localStorage.getItem("vijai-cart-v2")).toBeNull();
});
