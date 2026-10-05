import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Pagination, PageHeader, QueryState } from "./components";
import { useListAdminOrdersQuery, useOrderCountsQuery } from "../Features/Admin/adminApi";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../Features/Orders/ordersApi";
import { formatDateTime, formatPaise } from "../Utils/format";
import useDocumentTitle from "../Utils/useDocumentTitle";

// Work queues first: what needs doing today.
const QUEUES = [
  { value: "", label: "All orders" },
  { value: "to_verify", label: "Payments to check", count: "to_verify" },
  { value: "awaiting_pickup", label: "To be collected", count: "awaiting_pickup" },
  { value: "to_ship", label: "To pack & ship", count: "to_ship" },
  { value: "awaiting_payment", label: "Waiting for payment" },
  { value: "refunds_pending", label: "Refunds due", count: "refunds_pending" },
];

export const OrderStatusPill = ({ status }) => (
  <span className={`orderPill ${status.toLowerCase()}`}>{ORDER_STATUS_LABELS[status] ?? status}</span>
);

export const PaymentPill = ({ status }) => (
  <span className={`orderPill pay-${status.toLowerCase()}`}>{PAYMENT_STATUS_LABELS[status] ?? status}</span>
);

export const howLabel = (order) =>
  order.payment_method === "PAY_AT_STORE" ? "Pay at store · pickup" : "UPI · delivery";

const OrdersPage = () => {
  useDocumentTitle("Admin · Orders");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const filters = {
    q: params.get("q") || undefined,
    queue: params.get("queue") || undefined,
    status: params.get("status") || undefined,
    page: Number(params.get("page")) || 1,
    page_size: 25,
  };
  const query = useListAdminOrdersQuery(filters, { pollingInterval: 60000 });
  const { data: counts } = useOrderCountsQuery(undefined, { pollingInterval: 60000 });

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: "", ...changes }).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key)
    );
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Orders" />

      <div className="adminQueues" role="tablist" aria-label="Order queues">
        {QUEUES.map((queue) => {
          const count = queue.count ? counts?.[queue.count] : undefined;
          const active = (filters.queue ?? "") === queue.value;
          return (
            <button
              key={queue.value || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? "active" : ""}
              onClick={() => update({ queue: queue.value, status: "" })}
            >
              {queue.label}
              {count > 0 && <span className="adminNavCount">{count}</span>}
            </button>
          );
        })}
      </div>

      <form
        className="adminToolbar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: search.trim() });
        }}
      >
        <label className="visuallyHidden" htmlFor="admin-order-search">
          Search orders
        </label>
        <input
          id="admin-order-search"
          type="search"
          placeholder="Order number, customer name, email, phone or pincode"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select aria-label="Status" value={filters.status ?? ""} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Any status</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
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
                <th>Order</th>
                <th>Customer</th>
                <th>How</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No orders here.
                  </td>
                </tr>
              )}
              {query.data?.items.map((row) => (
                <tr
                  key={row.order_number}
                  onClick={() => navigate(`/admin/orders/${row.order_number}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <Link to={`/admin/orders/${row.order_number}`} onClick={(e) => e.stopPropagation()}>
                      {row.order_number}
                    </Link>
                    <div className="muted">
                      {formatDateTime(row.placed_at)} · {row.item_count} item{row.item_count === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td>
                    {row.customer_name}
                    <div className="muted">{row.customer_phone || row.customer_email}</div>
                  </td>
                  <td>{howLabel(row)}</td>
                  <td className="num">{formatPaise(row.total_paise)}</td>
                  <td>
                    <OrderStatusPill status={row.status} />
                  </td>
                  <td>
                    <PaymentPill status={row.payment_status} />
                    {row.payment_reference && <div className="muted">Ref {row.payment_reference}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={filters.page} totalPages={query.data?.total_pages ?? 0} onPage={(page) => update({ page })} />
      </QueryState>
    </>
  );
};

export default OrdersPage;
