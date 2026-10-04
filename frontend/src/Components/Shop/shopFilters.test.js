import {
  hasActiveFilters,
  parseFilters,
  toFacetParams,
  toProductParams,
  toSearchParams,
} from "./shopFilters";

const parse = (query) => parseFilters(new URLSearchParams(query));

describe("URL <-> filters", () => {
  test("defaults", () => {
    expect(parse("")).toEqual({
      q: "",
      category: "",
      brands: [],
      colors: [],
      genders: [],
      shapes: [],
      minPrice: null,
      maxPrice: null,
      inStock: false,
      sort: "featured",
      page: 1,
    });
  });

  test("parses lists, numbers and flags", () => {
    const filters = parse("q=%20way%20&category=sunglasses&brand=ray-ban,oakley&color=blue,black&min=5000&max=12000.4&stock=1&sort=price_desc&page=2");
    expect(filters).toMatchObject({
      q: "way",
      brands: ["ray-ban", "oakley"],
      colors: ["BLUE", "BLACK"],
      minPrice: 5000,
      maxPrice: 12000,
      inStock: true,
      sort: "price_desc",
      page: 2,
    });
  });

  test("ignores invalid values and maps old sort names", () => {
    expect(parse("sort=random&page=-3&min=abc")).toMatchObject({ sort: "featured", page: 1, minPrice: null });
    expect(parse("sort=price-asc").sort).toBe("price_asc");
  });

  test("round-trips through the URL", () => {
    const query = "q=wayfarer&brand=ray-ban&color=blue&gender=men&shape=round&min=6000&stock=1&sort=name_asc&page=3";
    expect(new URLSearchParams(toSearchParams(parse(query))).toString()).toBe(
      new URLSearchParams(query).toString()
    );
    expect(toSearchParams(parse(""))).toEqual({});
  });
});

describe("API parameters", () => {
  test("facets get filters only", () => {
    expect(toFacetParams(parse("color=blue&min=6000&sort=price_desc&page=2"))).toEqual({
      q: undefined,
      category: undefined,
      brand: [],
      color: ["BLUE"],
      gender: [],
      frame_shape: [],
      min_price: 6000,
      max_price: undefined,
      in_stock: undefined,
    });
  });

  test("products add sort and paging; searches sort by relevance by default", () => {
    expect(toProductParams(parse("page=2"))).toMatchObject({ sort: "featured", page: 2, page_size: 12 });
    expect(toProductParams(parse("q=round")).sort).toBe("relevance");
    expect(toProductParams(parse("q=round&sort=price_asc")).sort).toBe("price_asc");
  });

  test("active filter detection", () => {
    expect(hasActiveFilters(parse("sort=price_asc&page=3"))).toBe(false);
    expect(hasActiveFilters(parse("stock=1"))).toBe(true);
  });
});
