import React from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Pagination, PageHeader, QueryState } from "./components";
import { ENUMS, enumLabel, useListTransactionsQuery } from "../Features/Admin/adminApi";
import useDocumentTitle from "../Utils/useDocumentTitle";

const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });
const ALL_TYPES = [...ENUMS.adjustment, "SALE", "RETURN"];

export const TransactionTable = ({ rows, compact }) => (
  <div className="adminTableWrap">
    <table className="adminTable">
      <thead>
        <tr>
          <th>When</th>
          {!compact && <th>Product · colour</th>}
          <th>Change</th>
          <th className="num">Qty</th>
          <th className="num">On hand after</th>
          <th>Note</th>
          <th>By</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={compact ? 6 : 7} className="muted">
              No stock changes yet.
            </td>
          </tr>
        )}
        {rows.map((row) => (
          <tr key={row.id}>
            <td style={{ whiteSpace: "nowrap" }}>{dateTime.format(new Date(row.created_at))}</td>
            {!compact && (
              <td>
                {row.product_name}
                <div className="muted">
                  {row.color_name} · {row.sku}
                </div>
              </td>
            )}
            <td>
              {enumLabel(row.type)}
              {row.order_id && <div className="muted">Order #{row.order_id}</div>}
            </td>
            <td className={`num ${row.quantity_delta > 0 ? "deltaPositive" : "deltaNegative"}`}>
              {row.quantity_delta > 0 ? "+" : ""}
              {row.quantity_delta}
            </td>
            <td className="num">{row.on_hand_after}</td>
            <td>{row.note || <span className="muted">—</span>}</td>
            <td>{row.created_by || <span className="muted">System</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TransactionsPage = () => {
  useDocumentTitle("Admin · Stock history");
  const [params, setParams] = useSearchParams();
  const filters = {
    q: params.get("q") || undefined,
    type: params.get("type") || undefined,
    date_from: params.get("from") || undefined,
    date_to: params.get("to") || undefined,
    page: Number(params.get("page")) || 1,
    page_size: 50,
  };
  const query = useListTransactionsQuery(filters);
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Stock history">
        <Link to="/admin/inventory" className="adminButton secondary">
          Back to stock
        </Link>
      </PageHeader>
      <div className="adminToolbar">
        <input type="search" aria-label="Search SKU or product" placeholder="SKU or product" defaultValue={filters.q ?? ""} onKeyDown={(e) => e.key === "Enter" && update("q", e.currentTarget.value.trim())} />
        <select aria-label="Type" value={filters.type ?? ""} onChange={(e) => update("type", e.target.value)}>
          <option value="">All changes</option>
          {ALL_TYPES.map((type) => (
            <option key={type} value={type}>
              {enumLabel(type)}
            </option>
          ))}
        </select>
        <label className="adminCheck">
          From <input type="date" value={filters.date_from ?? ""} onChange={(e) => update("from", e.target.value)} />
        </label>
        <label className="adminCheck">
          To <input type="date" value={filters.date_to ?? ""} onChange={(e) => update("to", e.target.value)} />
        </label>
      </div>
      <QueryState query={query}>
        <TransactionTable rows={query.data?.items ?? []} />
        <Pagination page={query.data?.page ?? 1} totalPages={query.data?.total_pages ?? 0} onPage={(page) => update("page", String(page))} />
      </QueryState>
    </>
  );
};

export default TransactionsPage;
