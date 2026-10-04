import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Pagination, PageHeader, QueryState, StatusPill, StockBadge, Thumb } from "./components";
import {
  ENUMS,
  enumLabel,
  useListAdminBrandsQuery,
  useListAdminCategoriesQuery,
  useListAdminProductsQuery,
} from "../Features/Admin/adminApi";
import { formatPaise } from "../Utils/format";
import useDocumentTitle from "../Utils/useDocumentTitle";

const priceRange = (row) =>
  row.min_price_paise === null
    ? "—"
    : row.min_price_paise === row.max_price_paise
      ? formatPaise(row.min_price_paise)
      : `${formatPaise(row.min_price_paise)} – ${formatPaise(row.max_price_paise)}`;

const ProductsPage = () => {
  useDocumentTitle("Admin · Products");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const filters = {
    q: params.get("q") || undefined,
    category_id: params.get("category_id") || undefined,
    brand_id: params.get("brand_id") || undefined,
    status: params.get("status") || undefined,
    stock_status: params.get("stock_status") || undefined,
    page: Number(params.get("page")) || 1,
    page_size: 25,
  };
  const query = useListAdminProductsQuery(filters);
  const { data: categories = [] } = useListAdminCategoriesQuery();
  const { data: brands = [] } = useListAdminBrandsQuery();

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: "", ...changes }).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key)
    );
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Products">
        <Link to="/admin/products/new" className="adminButton">
          Add product
        </Link>
      </PageHeader>

      <form
        className="adminToolbar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: search.trim() });
        }}
      >
        <label className="visuallyHidden" htmlFor="admin-product-search">
          Search products
        </label>
        <input
          id="admin-product-search"
          type="search"
          placeholder="Search name, model or SKU"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select aria-label="Category" value={filters.category_id ?? ""} onChange={(e) => update({ category_id: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parent_id ? `— ${c.name}` : c.name}
            </option>
          ))}
        </select>
        <select aria-label="Brand" value={filters.brand_id ?? ""} onChange={(e) => update({ brand_id: e.target.value })}>
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select aria-label="Status" value={filters.status ?? ""} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Any status</option>
          {ENUMS.status.map((s) => (
            <option key={s} value={s}>
              {enumLabel(s)}
            </option>
          ))}
        </select>
        <select aria-label="Stock" value={filters.stock_status ?? ""} onChange={(e) => update({ stock_status: e.target.value })}>
          <option value="">Any stock</option>
          <option value="in_stock">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <button type="submit" className="adminButton secondary">
          Search
        </button>
      </form>

      <QueryState query={query}>
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>
                  <span className="visuallyHidden">Image</span>
                </th>
                <th>Product</th>
                <th>Category</th>
                <th className="num">Colours</th>
                <th className="num">Price</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No products match.
                  </td>
                </tr>
              )}
              {query.data?.items.map((row) => (
                <tr key={row.id} onClick={() => navigate(`/admin/products/${row.id}`)} style={{ cursor: "pointer" }}>
                  <td>
                    <Thumb image={row.image} />
                  </td>
                  <td>
                    <Link to={`/admin/products/${row.id}`} onClick={(e) => e.stopPropagation()}>
                      {row.name}
                    </Link>
                    <div className="muted">
                      {row.brand}
                      {row.model_number && ` · ${row.model_number}`}
                      {row.is_featured && " · Featured"}
                    </div>
                  </td>
                  <td>{row.category}</td>
                  <td className="num">{row.variant_count}</td>
                  <td className="num">{priceRange(row)}</td>
                  <td>
                    <StockBadge status={row.stock_status}>{row.total_available}</StockBadge>
                  </td>
                  <td>
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={query.data?.page ?? 1}
          totalPages={query.data?.total_pages ?? 0}
          onPage={(page) => update({ page: String(page) })}
        />
      </QueryState>
    </>
  );
};

export default ProductsPage;
