import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import "../Checkout/Checkout.css";
import "./Orders.css";
import UpiQr from "./UpiQr";
import { FormError } from "../Form/Form";
import { errorMessage } from "../../Api/errors";
import {
  customerStatus,
  useCancelOrderMutation,
  useGetOrderQuery,
  useReportPaymentMutation,
} from "../../Features/Orders/ordersApi";
import { imageUrl } from "../../Utils/cloudinary";
import { formatDate, formatDateTime, formatPaise } from "../../Utils/format";
import { notify } from "../../Utils/notify";

const timelineLabel = (status, fulfilment) =>
  ({
    PENDING_PAYMENT: "Order placed",
    CONFIRMED: fulfilment === "PICKUP" ? "Paid" : "Payment received",
    PROCESSING: "Being packed",
    SHIPPED: "Shipped",
    DELIVERED: fulfilment === "PICKUP" ? "Collected" : "Delivered",
    CANCELLED: "Cancelled",
  })[status] ?? status;

const minutesLeft = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 60000));

// Re-renders every 30 s (for countdowns).
const useTick = (active) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [active]);
};

const CopyButton = ({ text, label }) => (
  <button
    type="button"
    className="orderCopy"
    onClick={() =>
      navigator.clipboard
        ?.writeText(text)
        .then(() => notify.success(`${label} copied`))
        .catch(() => notify.error("Couldn’t copy. Please select and copy it."))
    }
  >
    Copy
  </button>
);

const UpiPanel = ({ order }) => {
  const { upi } = order;
  const [reference, setReference] = useState("");
  const [report, reportState] = useReportPaymentMutation();
  const left = minutesLeft(upi.pay_by);

  if (upi.reference_submitted) {
    return (
      <div className="orderPanel orderPanelHighlight" role="status">
        <h3>Thank you! We’re checking your payment</h3>
        <p>
          You told us you paid {formatPaise(upi.amount_paise)} (reference <strong>{upi.reference_submitted}</strong>
          ). We’ll email you as soon as we’ve confirmed it, usually within a few hours during shop hours.
        </p>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    try {
      await report({ orderNumber: order.order_number, reference: reference.trim() }).unwrap();
      notify.success("Thanks! We’ll confirm your payment soon.");
    } catch {
      // shown below
    }
  };

  return (
    <div className="orderPanel orderPanelHighlight">
      <h3>Pay {formatPaise(upi.amount_paise)} by UPI</h3>
      <p>
        Please pay within <strong>{left} minutes</strong> (by {formatDateTime(upi.pay_by)}). We’re holding your frames
        until then.
      </p>
      <div className="upiPay">
        <UpiQr uri={upi.upi_uri} />
        <div className="upiDetails">
          <a className="orderPrimary upiAppButton" href={upi.upi_uri}>
            Pay with a UPI app
          </a>
          <p className="checkoutOptionHint">On a computer? Scan the QR code with your phone’s UPI app.</p>
          <dl>
            <dt>UPI ID</dt>
            <dd>
              <strong>{upi.upi_id}</strong> <CopyButton text={upi.upi_id} label="UPI ID" />
            </dd>
            <dt>Name</dt>
            <dd>{upi.payee_name}</dd>
            <dt>Amount</dt>
            <dd>
              <strong>{formatPaise(upi.amount_paise)}</strong>
            </dd>
            <dt>Note</dt>
            <dd>
              {order.order_number} <CopyButton text={order.order_number} label="Order number" />
            </dd>
          </dl>
        </div>
      </div>
      <form className="upiReport" onSubmit={submit}>
        <label htmlFor="upi-reference">
          <strong>Paid? Enter the UPI reference number</strong>
          <span className="checkoutOptionHint">
            Your UPI app shows it after paying, as “UPI Ref No.”, “UTR” or “Transaction ID” (usually 12 digits).
          </span>
        </label>
        <div className="upiReportRow">
          <input
            id="upi-reference"
            inputMode="numeric"
            autoComplete="off"
            value={reference}
            onChange={(e) => setReference(e.target.value.replace(/\s/g, ""))}
            placeholder="e.g. 412345678901"
            maxLength={40}
            required
          />
          <button type="submit" className="orderPrimary" disabled={reference.trim().length < 6 || reportState.isLoading}>
            I’ve paid
          </button>
        </div>
        <FormError>{reportState.error ? errorMessage(reportState.error) : null}</FormError>
      </form>
    </div>
  );
};

const PickupPanel = ({ order }) => {
  const store = order.pickup_store;
  return (
    <div className="orderPanel orderPanelHighlight">
      <h3>Collect from our {store.name} store</h3>
      <p>
        Your frames are kept ready for you until <strong>{formatDate(order.expires_at)}</strong>. Pay{" "}
        {formatPaise(order.total_paise)} at the counter by cash, card or UPI, and mention order{" "}
        <strong>{order.order_number}</strong>.
      </p>
      <p className="checkoutOptionHint">
        {store.address}
        <br />
        Phone: {store.phone}
      </p>
    </div>
  );
};

const StatusNotice = ({ order }) => {
  if (order.status === "CANCELLED") {
    return (
      <div className="orderPanel" role="status">
        <h3>This order was cancelled</h3>
        <p>{order.cancel_reason}</p>
        {order.payment_status === "REFUND_PENDING" && <p>We’ll refund your payment to the account it came from.</p>}
        {order.payment_status === "REFUNDED" && <p>Your payment has been refunded.</p>}
      </div>
    );
  }
  if (order.status === "SHIPPED") {
    return (
      <div className="orderPanel orderPanelHighlight" role="status">
        <h3>On its way</h3>
        <p>
          {[order.courier_name, order.tracking_number].filter(Boolean).join(" · ")}
          {order.tracking_url && (
            <>
              {" "}
              <a href={order.tracking_url} target="_blank" rel="noreferrer">
                Track your parcel
              </a>
            </>
          )}
        </p>
      </div>
    );
  }
  if (order.status === "CONFIRMED" || order.status === "PROCESSING") {
    return (
      <div className="orderPanel" role="status">
        <h3>Payment received, thank you</h3>
        <p>We’re getting your order ready and will email you when it ships.</p>
      </div>
    );
  }
  return null;
};

const CancelOrder = ({ order }) => {
  const [cancel, state] = useCancelOrderMutation();
  const [asking, setAsking] = useState(false);
  if (!order.can_cancel) return null;
  if (!asking) {
    return (
      <button type="button" className="checkoutLinkButton" onClick={() => setAsking(true)}>
        Cancel this order
      </button>
    );
  }
  return (
    <div className="orderPanel" role="alertdialog" aria-label="Cancel this order?">
      <p>Cancel order {order.order_number}? The frames will go back on sale.</p>
      <div className="upiReportRow">
        <button
          type="button"
          className="orderPrimary"
          disabled={state.isLoading}
          onClick={() =>
            cancel({ orderNumber: order.order_number })
              .unwrap()
              .then(() => notify.success("Order cancelled"))
              .catch((err) => notify.error(errorMessage(err)))
          }
        >
          Yes, cancel it
        </button>
        <button type="button" className="checkoutLinkButton" onClick={() => setAsking(false)}>
          Keep my order
        </button>
      </div>
    </div>
  );
};

const OrderPage = () => {
  const { orderNumber } = useParams();
  const location = useLocation();
  const query = useGetOrderQuery(orderNumber, { refetchOnMountOrArgChange: true });
  const order = query.data;
  const waiting = order?.status === "PENDING_PAYMENT";
  useTick(waiting);

  // Pick up the expiry or the shop's confirmation without a reload.
  useEffect(() => {
    if (!waiting) return undefined;
    const id = setInterval(query.refetch, 60000);
    return () => clearInterval(id);
  }, [waiting, query.refetch]);

  if (query.isLoading) {
    return (
      <section className="orderSection">
        <p role="status">Loading your order…</p>
      </section>
    );
  }
  if (query.isError) {
    return (
      <section className="orderSection">
        <h2>Order</h2>
        <FormError>{query.error?.status === 404 ? "We couldn’t find this order." : errorMessage(query.error)}</FormError>
        <Link to="/account/orders">Your orders</Link>
      </section>
    );
  }

  return (
    <section className="orderSection">
      <Helmet>
        <title>{`Order ${order.order_number} – Vijai Opticians`}</title>
      </Helmet>
      {location.state?.justPlaced && (
        <p className="orderPlaced" role="status">
          Thank you! Your order is placed. We’ve emailed the details.
        </p>
      )}
      <header className="orderHeader">
        <div>
          <h2>Order {order.order_number}</h2>
          <p className="checkoutOptionHint">Placed {formatDateTime(order.placed_at)}</p>
        </div>
        <span className={`orderStatus ${order.status.toLowerCase()}`}>{customerStatus(order)}</span>
      </header>

      <div className="checkoutBody">
        <div className="checkoutMain">
          {order.upi && <UpiPanel order={order} />}
          {order.fulfilment === "PICKUP" && order.status === "PENDING_PAYMENT" && <PickupPanel order={order} />}
          <StatusNotice order={order} />

          <div className="orderPanel">
            <h3>Items</h3>
            <ul className="checkoutLines">
              {order.items.map((item) => (
                <li key={item.variant_id}>
                  <img
                    src={imageUrl(item.image_public_id && { public_id: item.image_public_id }, 160) ?? undefined}
                    alt=""
                    width={64}
                    height={64}
                  />
                  <span>
                    {item.product_name}
                    <span className="checkoutOptionHint">
                      {item.variant_label} · Qty {item.quantity} · {formatPaise(item.unit_price_paise)} each
                    </span>
                  </span>
                  <span>{formatPaise(item.line_total_paise)}</span>
                </li>
              ))}
            </ul>
            <table className="checkoutTotals">
              <tbody>
                <tr>
                  <th>Subtotal</th>
                  <td>{formatPaise(order.subtotal_paise)}</td>
                </tr>
                <tr>
                  <th>{order.fulfilment === "PICKUP" ? "Store pickup" : "Delivery"}</th>
                  <td>{order.delivery_fee_paise ? formatPaise(order.delivery_fee_paise) : "Free"}</td>
                </tr>
                <tr className="checkoutGrandTotal">
                  <th>Total</th>
                  <td>
                    {formatPaise(order.total_paise)}
                    <span className="checkoutOptionHint">Includes GST</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <CancelOrder order={order} />
        </div>

        <aside className="checkoutMain">
          {order.shipping_address && (
            <div className="orderPanel">
              <h3>Delivery address</h3>
              <p>
                {order.shipping_address.full_name}
                <br />
                {[order.shipping_address.line1, order.shipping_address.line2, order.shipping_address.landmark]
                  .filter(Boolean)
                  .join(", ")}
                <br />
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}
                <br />
                Phone: {order.shipping_address.phone}
              </p>
            </div>
          )}
          <div className="orderPanel">
            <h3>Progress</h3>
            <ol className="orderTimeline">
              {order.timeline.map((entry) => (
                <li key={`${entry.status}-${entry.at}`}>
                  <strong>{timelineLabel(entry.status, order.fulfilment)}</strong>
                  <span className="checkoutOptionHint">{formatDateTime(entry.at)}</span>
                </li>
              ))}
            </ol>
          </div>
          {order.customer_note && (
            <div className="orderPanel">
              <h3>Your note</h3>
              <p>{order.customer_note}</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};

export default OrderPage;
