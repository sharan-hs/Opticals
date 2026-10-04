import React, { useState } from "react";
import Drawer from "@mui/material/Drawer";
import { Link, useSearchParams } from "react-router-dom";

import { Pagination, PageHeader, QueryState, StockBadge, Thumb } from "./components";
import StockDialog from "./StockDialog";
import { TransactionTable } from "./TransactionsPage";
import {
  useListAdminBrandsQuery,
  useListAdminCategoriesQuery,
  useListInventoryQuery,
  useListTransactionsQuery,
  useLowStockQuery,
} from "../Features/Admin/adminApi";
import useDocumentTitle from "../Utils/useDocumentTitle";

const HistoryDrawer = ({ row, onClose }) => {
  const query = useListTransactionsQuery({ variant_id: row.variant_id, page_size: 50 });
  return (
    <Drawer anchor="right" open onClose={onClose}>
      <div style={{ width: "min(640px, 100vw)", padding: 20 }}>
        <PageHeader title={`History · ${row.sku}`}>
          <button type="button" className="adminButton secondary" onClick={onClose}>
            Close
          </button>
        </PageHeader>
        <p className="muted" style={{ marginBottom: 12 }}>
          {row.product_name} – {row.color_name}. Every stock change, newest first.
        </p>
        <QueryState query={query}>
          <TransactionTable rows={query.data?.items ?? []} compact />
        </QueryState>
      </div>
    </Drawer>
  );
};

const InventoryPage = () => {
  useDocumentTitle("Admin · Stock");
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [adjusting, setAdjusting] = useState(null);
  const [history, setHistory] = useState(null);
  const filters = {
    q: params.get("q") || undefined,
    stock_status: params.get("stock_status") || undefined,
    category_id: params.get("category_id") || undefined,
    brand_id: params.get("brand_id") || undefined,
    sort: params.get("sort") || "name",
    page: Number(params.get("page")) || 1,
    page_size: 50,
  };
  const query = useListInventoryQuery(filters);
  const { data: low = [] } = useLowStockQuery();
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
      <PageHeader title="Stock">
        <Link to="/admin/inventory/history" className="adminButton secondary">
          Stock history
        </Link>
      </PageHeader>

      <div className="adminSummary">
        <div>
          Low or out of stock <strong>{low.length}</strong>
          {low.length > 0 && (
            <button type="button" className="linkAction" onClick={() => update({ stock_status: "low", sort: "available" })}>
              Show low
            </button>
          )}
        </div>
      </div>

      <form
        className="adminToolbar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: search.trim() });
        }}
      >
        <label className="visuallyHidden" htmlFor="stock-search">
          Search stock
        </label>
        <input id="stock-search" type="search" placeholder="Search SKU, product or colour" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Stock" value={filters.stock_status ?? ""} onChange={(e) => update({ stock_status: e.target.value })}>
          <option value="">Any stock</option>
          <option value="in_stock">In stock</option>
          <option value="low">Low</option>
          <option value="out">Out</option>
        </select>
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
        <select aria-label="Sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
          <option value="name">Sort: product name</option>
          <option value="available">Sort: least available first</option>
          <option value="-available">Sort: most available first</option>
          <option value="-updated">Sort: recently changed</option>
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
                <th>Product · colour</th>
                <th>SKU</th>
                <th className="num">On hand</th>
                <th className="num">Reserved</th>
                <th className="num">Available</th>
                <th className="num">Alert at</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data?.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted">
                    Nothing matches.
                  </td>
                </tr>
              )}
              {query.data?.items.map((row) => (
                <tr key={row.variant_id}>
                  <td>
                    <Thumb image={row.image} size={44} />
                  </td>
                  <td>
                    <Link to={`/admin/products/${row.product_id}?tab=colours`}>{row.product_name}</Link>
                    <div className="muted">
                      {row.color_name}
                      {!row.variant_active && " · inactive"}
                      {row.product_status !== "ACTIVE" && ` · ${row.product_status.toLowerCase()}`}
                    </div>
                  </td>
                  <td>{row.sku}</td>
                  <td className="num">{row.on_hand}</td>
                  <td className="num">{row.reserved}</td>
                  <td className="num">
                    <strong>{row.available}</strong>
                  </td>
                  <td className="num">{row.low_stock_threshold}</td>
                  <td>
                    <StockBadge status={row.availability} />
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button type="button" className="adminButton small" onClick={() => setAdjusting(row)}>
                      Adjust
                    </button>{" "}
                    <button type="button" className="adminButton secondary small" onClick={() => setHistory(row)}>
                      History
                    </button>
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

      {adjusting && <StockDialog open row={adjusting} onClose={() => setAdjusting(null)} />}
      {history && <HistoryDrawer row={history} onClose={() => setHistory(null)} />}
    </>
  );
};

export default InventoryPage;
