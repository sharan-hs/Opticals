import { getColorSiblings, getProductBySlug, getProducts, getRelatedProducts } from "./catalog";

test("ids and slugs are unique and every product is complete", () => {
  const products = getProducts();
  expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
  expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
  products.forEach((p) => {
    expect(p.price).toBeGreaterThan(0);
    expect(p.imageCount).toBeGreaterThan(0);
    expect(p.slug).toMatch(/^[a-z0-9-]+$/);
  });
});

test("colour siblings share a model and related excludes them", () => {
  const havana = getProductBySlug("ray-ban-rb4349-havana");
  expect(getColorSiblings(havana).map((p) => p.color)).toEqual([
    "Transparent Brown",
    "Havana",
    "Transparent Green",
  ]);
  expect(getRelatedProducts(havana).every((p) => p.model !== "RB4349")).toBe(true);
});
