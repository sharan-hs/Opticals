import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ShopDetails.css";
import { Link, useSearchParams } from "react-router-dom";
import { IoFilterSharp, IoClose } from "react-icons/io5";
import { FaAngleRight, FaAngleLeft } from "react-icons/fa6";
import { BiSearch } from "react-icons/bi";

import Filter from "../Filters/Filter";
import ProductCard, { ProductCardSkeleton } from "../../ProductCard/ProductCard";
import { errorMessage } from "../../../Api/errors";
import { useGetFacetsQuery, useGetProductsQuery } from "../../../Features/Catalog/catalogApi";
import { formatINR } from "../../../Utils/format";
import {
  PAGE_SIZE,
  SORT_OPTIONS,
  hasActiveFilters,
  parseFilters,
  toFacetParams,
  toProductParams,
  toSearchParams,
} from "../shopFilters";

const EMPTY_FACETS = {
  categories: [],
  brands: [],
  colors: [],
  genders: [],
  frame_shapes: [],
  frame_types: [],
  materials: [],
  price: null,
};

const labelFor = (options, value) => options.find((o) => o.value === value)?.label ?? value;

const ActiveFilterChips = ({ filters, facets, onChange }) => {
  const listChips = (key, options) =>
    filters[key].map((value) => ({
      label: labelFor(options, value),
      changes: { [key]: filters[key].filter((v) => v !== value) },
    }));
  const chips = [
    filters.q && { label: `“${filters.q}”`, changes: { q: "" } },
    filters.category && {
      label: labelFor(facets.categories, filters.category),
      changes: { category: "" },
    },
    ...listChips("brands", facets.brands),
    ...listChips("colors", facets.colors),
    ...listChips("shapes", facets.frame_shapes),
    ...listChips("genders", facets.genders),
    (filters.minPrice !== null || filters.maxPrice !== null) && {
      label: `${formatINR(filters.minPrice ?? 0)} – ${
        filters.maxPrice !== null ? formatINR(filters.maxPrice) : "any"
      }`,
      changes: { minPrice: null, maxPrice: null },
    },
    filters.inStock && { label: "In stock", changes: { inStock: false } },
  ].filter(Boolean);

  if (!chips.length) return null;
  return (
    <ul className="activeFilterChips" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.label}>
          <button type="button" onClick={() => onChange(chip.changes)}>
            {chip.label}
            <IoClose aria-label="Remove filter" />
          </button>
        </li>
      ))}
    </ul>
  );
};

const ShopDetails = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.q);
  const resultsRef = useRef(null);
  const filterToggleRef = useRef(null);
  const drawerCloseRef = useRef(null);
  const drawerWasOpen = useRef(false);

  const productsQuery = useGetProductsQuery(toProductParams(filters));
  const { data: facetData } = useGetFacetsQuery(toFacetParams(filters));
  const facets = facetData ?? EMPTY_FACETS;

  useEffect(() => {
    setSearchText(filters.q);
  }, [filters.q]);

  // Any filter, search or sort change starts again from page 1.
  const updateFilters = (changes) =>
    setSearchParams(toSearchParams({ ...filters, page: 1, ...changes }));

  const clearAllFilters = () => setSearchParams({});

  const page = productsQuery.data;
  const items = page?.items ?? [];
  const resultCount = page?.total ?? 0;
  const currentPage = page?.page ?? filters.page;
  const totalPages = page?.total_pages ?? 0;

  const goToPage = (page) => {
    updateFilters({ page });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Move focus into the drawer when it opens and back to the toggle on close.
  useEffect(() => {
    if (isDrawerOpen) {
      drawerCloseRef.current?.focus();
    } else if (drawerWasOpen.current) {
      filterToggleRef.current?.focus();
    }
    drawerWasOpen.current = isDrawerOpen;
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isDrawerOpen) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && setIsDrawerOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  return (
    <div className="shopDetails">
      <div className="shopDetailMain">
        <div
          className={`filterOverlay ${isDrawerOpen ? "open" : ""}`}
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={`shopDetails__left ${isDrawerOpen ? "open" : ""}`}
          aria-label="Filters"
        >
          <div className="drawerHeader">
            <p>Filter By</p>
            <button
              ref={drawerCloseRef}
              type="button"
              className="closeButton"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close filters"
            >
              <IoClose size={26} />
            </button>
          </div>
          <div className="drawerContent">
            <Filter
              facets={facets}
              filters={filters}
              onChange={updateFilters}
              onClearAll={clearAllFilters}
            />
          </div>
          <div className="drawerFooter">
            <button type="button" onClick={() => setIsDrawerOpen(false)}>
              Show {resultCount} {resultCount === 1 ? "result" : "results"}
            </button>
          </div>
        </aside>

        <div className="shopDetails__right" ref={resultsRef}>
          <div className="shopDetailsSorting">
            <nav className="shopDetailsBreadcrumbLink" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              &nbsp;/&nbsp;
              <span>The Shop</span>
            </nav>
            <form
              className="shopSearch"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                updateFilters({ q: searchText.trim() });
              }}
            >
              <label htmlFor="shop-search" className="visuallyHidden">
                Search products
              </label>
              <input
                id="shop-search"
                type="search"
                placeholder="Search products"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <button type="submit" aria-label="Search">
                <BiSearch size={20} />
              </button>
            </form>
            <div className="shopDetailsSort">
              <button
                ref={filterToggleRef}
                type="button"
                className="filterToggle"
                onClick={() => setIsDrawerOpen(true)}
                aria-expanded={isDrawerOpen}
              >
                <IoFilterSharp aria-hidden="true" />
                Filter
              </button>
              <label htmlFor="sort" className="visuallyHidden">
                Sort by
              </label>
              <select
                id="sort"
                value={filters.sort}
                onChange={(event) => updateFilters({ sort: event.target.value })}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ActiveFilterChips filters={filters} facets={facets} onChange={updateFilters} />
          <p className="shopResultCount" aria-live="polite">
            {productsQuery.isLoading
              ? "Loading products…"
              : `${resultCount} ${resultCount === 1 ? "product" : "products"}`}
          </p>

          {productsQuery.isError ? (
            <div className="shopEmptyState" role="alert">
              <h3>We couldn’t load the products</h3>
              <p>{errorMessage(productsQuery.error)}</p>
              <button type="button" onClick={() => productsQuery.refetch()}>
                Try again
              </button>
            </div>
          ) : productsQuery.isLoading ? (
            <div className="shopDetailsProductsContainer" aria-busy="true">
              {Array.from({ length: PAGE_SIZE / 2 }, (_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : items.length > 0 ? (
            <div
              className={`shopDetailsProductsContainer ${productsQuery.isFetching ? "isRefreshing" : ""}`}
              aria-busy={productsQuery.isFetching}
            >
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="shopEmptyState">
              <h3>No products match your filters</h3>
              <p>Try removing a filter or searching for something else.</p>
              {hasActiveFilters(filters) && (
                <button type="button" onClick={clearAllFilters}>
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="shopDetailsPagination" aria-label="Pagination">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <FaAngleLeft aria-hidden="true" />
                Prev
              </button>
              <div className="paginationNum">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (page) => (
                    <button
                      type="button"
                      key={page}
                      onClick={() => goToPage(page)}
                      aria-current={page === currentPage ? "page" : undefined}
                      aria-label={`Page ${page}`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <FaAngleRight aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopDetails;
