// Shop filter state lives in the URL query string so results can be shared,
// refreshed and navigated with Back. These helpers translate between the URL
// and the API's query parameters.

export const PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price, low to high" },
  { value: "price_desc", label: "Price, high to low" },
  { value: "name_asc", label: "Alphabetically, A-Z" },
  { value: "name_desc", label: "Alphabetically, Z-A" },
];

const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);
// Links from the old site used hyphens.
const LEGACY_SORTS = {
  "price-asc": "price_asc",
  "price-desc": "price_desc",
  "name-asc": "name_asc",
  "name-desc": "name_desc",
};

const parseList = (value) =>
  value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];

const parseNumber = (value) => {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
};

export const parseFilters = (searchParams) => {
  const page = parseInt(searchParams.get("page"), 10);
  const rawSort = searchParams.get("sort");
  const sort = LEGACY_SORTS[rawSort] ?? rawSort;
  return {
    q: (searchParams.get("q") || "").trim(),
    category: searchParams.get("category") || "",
    brands: parseList(searchParams.get("brand")),
    colors: parseList(searchParams.get("color")).map((c) => c.toUpperCase()),
    genders: parseList(searchParams.get("gender")).map((g) => g.toUpperCase()),
    shapes: parseList(searchParams.get("shape")).map((s) => s.toUpperCase()),
    minPrice: parseNumber(searchParams.get("min")),
    maxPrice: parseNumber(searchParams.get("max")),
    inStock: searchParams.get("stock") === "1",
    sort: SORT_VALUES.includes(sort) ? sort : "featured",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
};

// Only non-default values are written, keeping URLs short.
export const toSearchParams = (filters) => {
  const params = {};
  if (filters.q) params.q = filters.q;
  if (filters.category) params.category = filters.category;
  if (filters.brands.length) params.brand = filters.brands.join(",");
  if (filters.colors.length) params.color = filters.colors.join(",").toLowerCase();
  if (filters.genders.length) params.gender = filters.genders.join(",").toLowerCase();
  if (filters.shapes.length) params.shape = filters.shapes.join(",").toLowerCase();
  if (filters.minPrice !== null) params.min = String(filters.minPrice);
  if (filters.maxPrice !== null) params.max = String(filters.maxPrice);
  if (filters.inStock) params.stock = "1";
  if (filters.sort !== "featured") params.sort = filters.sort;
  if (filters.page > 1) params.page = String(filters.page);
  return params;
};

// Filters for /products/facets (no sort/page).
export const toFacetParams = (filters) => ({
  q: filters.q || undefined,
  category: filters.category || undefined,
  brand: filters.brands,
  color: filters.colors,
  gender: filters.genders,
  frame_shape: filters.shapes,
  min_price: filters.minPrice ?? undefined,
  max_price: filters.maxPrice ?? undefined,
  in_stock: filters.inStock || undefined,
});

export const toProductParams = (filters) => ({
  ...toFacetParams(filters),
  sort: filters.q && filters.sort === "featured" ? "relevance" : filters.sort,
  page: filters.page,
  page_size: PAGE_SIZE,
});

export const hasActiveFilters = (filters) =>
  Boolean(
    filters.q ||
      filters.category ||
      filters.brands.length ||
      filters.colors.length ||
      filters.genders.length ||
      filters.shapes.length ||
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.inStock
  );
