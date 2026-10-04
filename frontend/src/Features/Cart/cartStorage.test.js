import { loadCart, saveCart } from "./cartStorage";

const KEY = "vijai-cart-v2";
const LINE = {
  sku: "ORB2132",
  slug: "ray-ban-new-wayfarer-rb2132",
  name: "Ray-Ban New Wayfarer",
  colorName: "Black",
  pricePaise: 1249000,
  image: null,
  quantity: 2,
};

beforeEach(() => localStorage.clear());

test("round-trips a saved cart", () => {
  saveCart({ items: [LINE] });
  expect(loadCart()).toEqual({ items: [LINE] });
});

test("returns undefined when nothing or garbage is stored", () => {
  expect(loadCart()).toBeUndefined();
  localStorage.setItem(KEY, "{not json");
  expect(loadCart()).toBeUndefined();
});

test("drops malformed lines and caps quantities", () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      items: [
        { ...LINE, quantity: 50 },
        { ...LINE, sku: "X", quantity: -2 },
        { ...LINE, sku: "Y", pricePaise: "free" },
        { id: "orb2132", quantity: 1 },
      ],
    })
  );
  expect(loadCart()).toEqual({ items: [{ ...LINE, quantity: 10 }] });
});

test("discards carts saved by the old static catalogue", () => {
  localStorage.setItem("vijai-cart-v1", JSON.stringify({ items: [{ id: "orb2132", quantity: 1 }] }));
  expect(loadCart()).toBeUndefined();
  expect(localStorage.getItem("vijai-cart-v1")).toBeNull();
});
