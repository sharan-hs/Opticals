// Pure helpers for the shop page. Filter state lives in the URL query
// string so results can be shared, refreshed and navigated with Back.

export const PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "name-asc", label: "Alphabetically, A-Z" },
  { value: "name-desc", label: "Alphabetically, Z-A" },
];

const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);

const parseList = (value) =>
  value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];

const parseNumber = (value) => {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export const parseFilters = (searchParams) => {
  const page = parseInt(searchParams.get("page"), 10);
  const sort = searchParams.get("sort");
  return {
    q: (searchParams.get("q") || "").trim(),
    category: searchParams.get("category") || "",
    brands: parseList(searchParams.get("brand")),
    colors: parseList(searchParams.get("color")),
    minPrice: parseNumber(searchParams.get("min")),
    maxPrice: parseNumber(searchParams.get("max")),
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
  if (filters.colors.length) params.color = filters.colors.join(",");
  if (filters.minPrice !== null) params.min = String(filters.minPrice);
  if (filters.maxPrice !== null) params.max = String(filters.maxPrice);
  if (filters.sort !== "featured") params.sort = filters.sort;
  if (filters.page > 1) params.page = String(filters.page);
  return params;
};

const searchableText = (product) =>
  [product.brand, product.name, product.model, product.color, product.category]
    .join(" ")
    .toLowerCase();

export const filterProducts = (products, filters) => {
  const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  return products.filter(
    (product) =>
      terms.every((term) => searchableText(product).includes(term)) &&
      (!filters.category || product.category === filters.category) &&
      (!filters.brands.length || filters.brands.includes(product.brand)) &&
      (!filters.colors.length || filters.colors.includes(product.color)) &&
      (filters.minPrice === null || product.price >= filters.minPrice) &&
      (filters.maxPrice === null || product.price <= filters.maxPrice)
  );
};

export const sortProducts = (products, sort) => {
  const sorted = [...products];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return sorted; // catalogue order
  }
};

export const paginate = (items, page, pageSize = PAGE_SIZE) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  return {
    items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    currentPage,
    totalPages,
  };
};

const countBy = (products, key) => {
  const counts = new Map();
  products.forEach((product) =>
    counts.set(product[key], (counts.get(product[key]) || 0) + 1)
  );
  return [...counts.entries()].map(([value, count]) => ({ value, count }));
};

// Options shown in the filter panel, derived from the catalogue itself.
export const getFacets = (products) => {
  const prices = products.map((product) => product.price);
  const colorHex = Object.fromEntries(
    products.map((product) => [product.color, product.colorHex])
  );
  return {
    categories: countBy(products, "category"),
    brands: countBy(products, "brand"),
    colors: countBy(products, "color").map((color) => ({
      ...color,
      hex: colorHex[color.value],
    })),
    price: {
      // Rounded outwards to the nearest ₹500 for a tidy slider.
      min: prices.length ? Math.floor(Math.min(...prices) / 500) * 500 : 0,
      max: prices.length ? Math.ceil(Math.max(...prices) / 500) * 500 : 0,
    },
  };
};

export const hasActiveFilters = (filters) =>
  Boolean(
    filters.q ||
      filters.category ||
      filters.brands.length ||
      filters.colors.length ||
      filters.minPrice !== null ||
      filters.maxPrice !== null
  );
