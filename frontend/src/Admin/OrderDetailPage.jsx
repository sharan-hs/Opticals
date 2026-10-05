import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { PageHeader, QueryState } from "./components";
import { howLabel, OrderStatusPill, PaymentPill } from "./OrdersPage";
import { FormError } from "../Components/Form/Form";
import { errorMessage } from "../Api/errors";
import { useGetAdminOrderQuery, useOrderActionMutation } from "../Features/Admin/adminApi";
import { ORDER_STATUS_LABELS } from "../Features/Orders/ordersApi";
import { imageUrl } from "../Utils/cloudinary";
import { formatDateTime, formatPaise } from "../Utils/format";
import { notify } from "../Utils/notify";
import useDocumentTitle from "../Utils/useDocumentTitle";

// Every button the API may offer (`order.actions`), in display order.
const ACTIONS = (order) => {
  const reported = order.payments.at(-1)?.reference ?? "";
  const paid = order.payment_status === "PAID";
  return {
    confirm_payment: {
      label: order.status === "CANCELLED" ? "Payment arrived after all" : "Confirm payment received",
      path: "confirm-payment",
      title: `Did ${formatPaise(order.total_paise)} reach the shop’s account?`,
      text:
        order.status === "CANCELLED"
          ? "This reopens the order if the frames are still in stock."
          : "Check your bank or UPI app first. The frames are then marked as sold.",
      fields: [
        { name: "reference", label: "UPI reference (UTR)", defaultValue: reported },
        { name: "note", label: "Note (optional)" },
      ],
      confirm: "Yes, payment received",
    },
    reject_payment: {
      label: "Payment not received",
      path: "reject-payment",
      title: "Cancel this order because no payment arrived?",
      text: "The frames go back on sale and the customer is emailed.",
      fields: [{ name: "note", label: "What happened?", required: true, placeholder: "No such payment in the bank" }],
      confirm: "Cancel the order",
      danger: true,
    },
    collected: {
      label: "Collected and paid",
      path: "collected",
      title: `Customer paid ${formatPaise(order.total_paise)} and took the order?`,
      text: "The frames are marked as sold.",
      fields: [{ name: "note", label: "Note (optional)", placeholder: "Paid by cash" }],
      confirm: "Yes, collected",
    },
    processing: {
      label: "Start packing",
      path: "status",
      body: { status: "PROCESSING" },
    },
    shipped: {
      label: "Mark shipped",
      path: "status",
      title: "Shipping details",
      text: "The customer gets these in an email.",
      fields: [
        { name: "courier_name", label: "Courier", placeholder: "e.g. DTDC, India Post" },
        { name: "tracking_number", label: "Tracking number", required: true },
        { name: "tracking_url", label: "Tracking link (optional)", placeholder: "https://…" },
      ],
      body: { status: "SHIPPED" },
      confirm: "Mark shipped",
    },
    delivered: {
      label: "Mark delivered",
      path: "status",
      body: { status: "DELIVERED" },
    },
    cancel: {
      label: "Cancel order",
      path: "cancel",
      title: "Cancel this order?",
      text: paid
        ? "The frames go back into stock. Refund the customer yourself, then press “Refund sent”."
        : "The frames go back on sale and the customer is emailed.",
      fields: [{ name: "reason", label: "Reason (the customer sees this)", required: true }],
      confirm: "Cancel the order",
      danger: true,
    },
    refunded: {
      label: "Refund sent",
      path: "refunded",
      title: `Have you refunded ${formatPaise(order.total_paise)}?`,
      fields: [{ name: "note", label: "How (optional)", placeholder: "UPI refund, reference …" }],
      confirm: "Yes, refunded",
    },
  };
};

const ActionDialog = ({ action, busy, error, onSubmit, onClose }) => {
  const [values, setValues] = useState(() =>
    Object.fromEntries((action.fields ?? []).map((f) => [f.name, f.defaultValue ?? ""]))
  );
  const missing = (action.fields ?? []).some((f) => f.required && !values[f.name]?.trim());
  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth aria-labelledby="action-title">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(values);
        }}
      >
        <DialogTitle id="action-title">{action.title}</DialogTitle>
        <DialogContent>
          {action.text && <p className="muted" style={{ marginBottom: 12 }}>{action.text}</p>}
          <FormError>{error ? errorMessage(error) : null}</FormError>
          {(action.fields ?? []).map((field) => (
            <label key={field.name} className="adminField" style={{ marginTop: 10 }}>
              {field.label}
              <input
                className="adminInput"
                value={values[field.name]}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              />
            </label>
          ))}
        </DialogContent>
        <DialogActions>
          <button type="button" className="adminButton secondary" onClick={onClose} disabled={busy}>
            Back
          </button>
          <button type="submit" className={`adminButton ${action.danger ? "danger" : ""}`} disabled={busy || missing}>
            {action.confirm}
          </button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Address = ({ address }) => (
  <p>
    {address.full_name}
    <br />
    {[address.line1, address.line2, address.landmark].filter(Boolean).join(", ")}
    <br />
    {address.city}, {address.state} {address.pincode}
    <br />
    Phone: {address.phone}
  </p>
);

const OrderDetailPage = () => {
  const { orderNumber } = useParams();
  useDocumentTitle(`Admin · ${orderNumber}`);
  const query = useGetAdminOrderQuery(orderNumber, { refetchOnMountOrArgChange: true });
  const [runAction, actionState] = useOrderActionMutation();
  const [open, setOpen] = useState(null);
  const order = query.data;

  const run = async (key, action, values = {}) => {
    const body = Object.fromEntries(Object.entries({ ...action.body, ...values }).map(([k, v]) => [k, v === "" ? null : v]));
    try {
      await runAction({ orderNumber, action: action.path, ...body }).unwrap();
      notify.success("Saved");
      setOpen(null);
    } catch (err) {
      if (!action.fields) notify.error(errorMessage(err));
    }
  };

  return (
    <QueryState query={query}>
      {order && (
        <>
          <p>
            <Link to="/admin/orders">← Orders</Link>
          </p>
          <PageHeader title={`Order ${order.order_number}`}>
            <OrderStatusPill status={order.status} />
            <PaymentPill status={order.payment_status} />
          </PageHeader>

          {order.actions.length > 0 && (
            <section className="adminCard">
              <h2>Next step</h2>
              <div className="adminToolbar">
                {order.actions.map((key) => {
                  const action = ACTIONS(order)[key];
                  const danger = ["cancel", "reject_payment"].includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`adminButton ${danger ? "secondary" : ""}`}
                      disabled={actionState.isLoading}
                      onClick={() => (action.fields ? setOpen(key) : run(key, action))}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
              {order.payment_status === "VERIFYING" && (
                <p className="adminNotice">
                  The customer says they paid by UPI (reference <strong>{order.payments.at(-1)?.reference}</strong>).
                  Check that {formatPaise(order.total_paise)} reached the account before confirming.
                </p>
              )}
              {order.status === "PENDING_PAYMENT" && order.expires_at && order.payment_status === "UNPAID" && (
                <p className="muted">
                  {order.fulfilment === "PICKUP" ? "Held for collection until" : "Cancels itself if unpaid by"}{" "}
                  {formatDateTime(order.expires_at)}.
                </p>
              )}
            </section>
          )}
          {open && (
            <ActionDialog
              action={ACTIONS(order)[open]}
              busy={actionState.isLoading}
              error={actionState.error}
              onClose={() => {
                actionState.reset();
                setOpen(null);
              }}
              onSubmit={(values) => run(open, ACTIONS(order)[open], values)}
            />
          )}

          <div className="adminOrderGrid">
            <section className="adminCard">
              <h2>Items</h2>
              <table className="adminTable">
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.variant_id}>
                      <td style={{ width: 56 }}>
                        {item.image_public_id && (
                          <img
                            className="adminThumb"
                            src={imageUrl({ public_id: item.image_public_id }, 112)}
                            alt=""
                            width={48}
                            height={48}
                          />
                        )}
                      </td>
                      <td>
                        {item.product_name}
                        <div className="muted">
                          {item.variant_label} · {item.sku}
                        </div>
                      </td>
                      <td className="num">
                        {item.quantity} × {formatPaise(item.unit_price_paise)}
                      </td>
                      <td className="num">{formatPaise(item.line_total_paise)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3}>{order.fulfilment === "PICKUP" ? "Store pickup" : "Delivery"}</td>
                    <td className="num">{order.delivery_fee_paise ? formatPaise(order.delivery_fee_paise) : "Free"}</td>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <strong>Total</strong> <span className="muted">(includes GST {formatPaise(order.tax_paise)})</span>
                    </td>
                    <td className="num">
                      <strong>{formatPaise(order.total_paise)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              {order.customer_note && <p className="adminNotice">Customer note: {order.customer_note}</p>}
            </section>

            <section className="adminCard">
              <h2>Customer</h2>
              <p>
                {order.customer_name}
                <br />
                <a href={`mailto:${order.customer_email}`}>{order.customer_email}</a>
                {(order.contact_phone || order.customer_phone) && (
                  <>
                    <br />
                    <a href={`tel:${order.contact_phone || order.customer_phone}`}>
                      {order.contact_phone || order.customer_phone}
                    </a>
                  </>
                )}
              </p>
              <h2 style={{ marginTop: 16 }}>{order.fulfilment === "PICKUP" ? "Collects from" : "Deliver to"}</h2>
              {order.shipping_address && <Address address={order.shipping_address} />}
              {order.pickup_store && <p>{order.pickup_store.name} store</p>}
              {order.tracking_number && (
                <p>
                  {order.courier_name} · {order.tracking_number}
                  {order.tracking_url && (
                    <>
                      {" "}
                      <a href={order.tracking_url} target="_blank" rel="noreferrer">
                        Track
                      </a>
                    </>
                  )}
                </p>
              )}
              <h2 style={{ marginTop: 16 }}>Payment</h2>
              <p>
                {howLabel(order)}
                {order.payments.map((p) => (
                  <span key={p.id} className="muted" style={{ display: "block" }}>
                    {p.reference ? `Reference ${p.reference}` : "No reference yet"}
                    {p.reported_at && ` · reported ${formatDateTime(p.reported_at)}`}
                  </span>
                ))}
              </p>
            </section>
          </div>

          <section className="adminCard">
            <h2>History</h2>
            <ol className="adminHistory">
              {order.history.map((entry, index) => (
                <li key={index}>
                  <strong>
                    {entry.from_status === entry.to_status ? entry.note : ORDER_STATUS_LABELS[entry.to_status]}
                  </strong>{" "}
                  <span className="muted">
                    {formatDateTime(entry.at)}
                    {entry.by && ` · ${entry.by}`}
                  </span>
                  {entry.note && entry.from_status !== entry.to_status && <div className="muted">{entry.note}</div>}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </QueryState>
  );
};

export default OrderDetailPage;
