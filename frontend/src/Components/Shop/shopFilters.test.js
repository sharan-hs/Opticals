import {
  filterProducts,
  getFacets,
  hasActiveFilters,
  paginate,
  parseFilters,
  sortProducts,
  toSearchParams,
} from "./shopFilters";

const products = [
  { id: "a", name: "Alpha", brand: "Ray-Ban", model: "RB1", category: "Sunglasses", color: "Black", colorHex: "#000", price: 5000 },
  { id: "b", name: "Bravo Havana", brand: "Ray-Ban", model: "RB2", category: "Sunglasses", color: "Havana", colorHex: "#7B3F00", price: 9000 },
  { id: "c", name: "Charlie", brand: "Oakley", model: "OK1", category: "Eyeglasses", color: "Black", colorHex: "#000", price: 7000 },
];

const filters = (overrides = {}) => ({
  ...parseFilters(new URLSearchParams()),
  ...overrides,
});

describe("parseFilters / toSearchParams", () => {
  test("defaults for an empty query string", () => {
    expect(parseFilters(new URLSearchParams())).toEqual({
      q: "", category: "", brands: [], colors: [],
      minPrice: null, maxPrice: null, sort: "featured", page: 1,
    });
  });

  test("parses lists, numbers and rejects invalid values", () => {
    const parsed = parseFilters(
      new URLSearchParams("q= gold &brand=Ray-Ban,Oakley&color=Black&min=1000&max=abc&sort=bogus&page=-3")
    );
    expect(parsed).toMatchObject({
      q: "gold", brands: ["Ray-Ban", "Oakley"], colors: ["Black"],
      minPrice: 1000, maxPrice: null, sort: "featured", page: 1,
    });
  });

  test("round-trips and omits defaults", () => {
    const f = filters({ brands: ["Ray-Ban"], minPrice: 500, sort: "price-asc", page: 2 });
    const params = toSearchParams(f);
    expect(params).toEqual({ brand: "Ray-Ban", min: "500", sort: "price-asc", page: "2" });
    expect(parseFilters(new URLSearchParams(params))).toEqual(f);
    expect(toSearchParams(filters())).toEqual({});
  });
});

describe("filterProducts", () => {
  test("search matches every term across brand, name, colour", () => {
    expect(filterProducts(products, filters({ q: "ray havana" })).map((p) => p.id)).toEqual(["b"]);
  });

  test("combines category, brand, colour and price", () => {
    expect(filterProducts(products, filters({ colors: ["Black"] })).map((p) => p.id)).toEqual(["a", "c"]);
    expect(filterProducts(products, filters({ colors: ["Black"], brands: ["Oakley"] })).map((p) => p.id)).toEqual(["c"]);
    expect(filterProducts(products, filters({ category: "Sunglasses", minPrice: 6000 })).map((p) => p.id)).toEqual(["b"]);
    expect(filterProducts(products, filters({ maxPrice: 7000 })).map((p) => p.id)).toEqual(["a", "c"]);
  });
});

describe("sortProducts", () => {
  test.each([
    ["price-asc", ["a", "c", "b"]],
    ["price-desc", ["b", "c", "a"]],
    ["name-asc", ["a", "b", "c"]],
    ["name-desc", ["c", "b", "a"]],
    ["featured", ["a", "b", "c"]],
  ])("%s", (sort, expected) => {
    expect(sortProducts(products, sort).map((p) => p.id)).toEqual(expected);
  });

  test("does not mutate the input", () => {
    const copy = [...products];
    sortProducts(products, "price-desc");
    expect(products).toEqual(copy);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  test("slices pages", () => {
    expect(paginate(items, 2, 10)).toEqual({ items: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19], currentPage: 2, totalPages: 3 });
  });

  test("clamps a page past the end to the last page", () => {
    expect(paginate(items, 9, 10).currentPage).toBe(3);
  });

  test("empty list still has one page", () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], currentPage: 1, totalPages: 1 });
  });
});

test("getFacets counts values and rounds the price range", () => {
  const facets = getFacets(products);
  expect(facets.brands).toEqual([{ value: "Ray-Ban", count: 2 }, { value: "Oakley", count: 1 }]);
  expect(facets.colors).toContainEqual({ value: "Havana", count: 1, hex: "#7B3F00" });
  expect(facets.price).toEqual({ min: 5000, max: 9000 });
});

test("hasActiveFilters ignores sort and page", () => {
  expect(hasActiveFilters(filters({ sort: "price-asc", page: 3 }))).toBe(false);
  expect(hasActiveFilters(filters({ colors: ["Black"] }))).toBe(true);
});
