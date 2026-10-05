import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import "./Checkout.css";
import AddressForm from "../Account/AddressForm";
import { FormError } from "../Form/Form";
import { apiErrorCode, errorMessage } from "../../Api/errors";
import { useCreateAddressMutation, useGetAddressesQuery } from "../../Features/Account/accountApi";
import { selectCurrentUser } from "../../Features/Auth/authSlice";
import { useGetQuoteQuery, usePlaceOrderMutation } from "../../Features/Orders/ordersApi";
import { imageUrl } from "../../Utils/cloudinary";
import { formatPaise } from "../../Utils/format";
import { notify } from "../../Utils/notify";

// One key per visit to checkout: a retry or double click can't create a
// second order (the API returns the first one).
export const newIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const MethodOption = ({ value, checked, onChange, title, children }) => (
  <label className={`checkoutOption ${checked ? "selected" : ""}`}>
    <input type="radio" name="method" value={value} checked={checked} onChange={() => onChange(value)} />
    <span>
      <strong>{title}</strong>
      <span className="checkoutOptionHint">{children}</span>
    </span>
  </label>
);

const AddressChoice = ({ selected, onSelect }) => {
  const user = useSelector(selectCurrentUser);
  const { data: addresses = [], isLoading } = useGetAddressesQuery();
  const [createAddress, createState] = useCreateAddressMutation();
  const [adding, setAdding] = useState(false);

  // Pick the default address once the list arrives.
  useEffect(() => {
    if (selected === null && addresses.length > 0) {
      onSelect((addresses.find((a) => a.is_default) ?? addresses[0]).id);
    }
  }, [addresses, selected, onSelect]);

  if (isLoading) return <p role="status">Loading your addresses…</p>;

  if (adding || addresses.length === 0) {
    return (
      <AddressForm
        defaultName={user?.full_name}
        saving={createState.isLoading}
        error={createState.error}
        onCancel={addresses.length ? () => setAdding(false) : undefined}
        onSave={async (payload) => {
          const created = await createAddress(payload).unwrap();
          onSelect(created.id);
          setAdding(false);
        }}
      />
    );
  }

  return (
    <>
      {addresses.map((address) => (
        <label key={address.id} className={`checkoutOption ${selected === address.id ? "selected" : ""}`}>
          <input
            type="radio"
            name="address"
            checked={selected === address.id}
            onChange={() => onSelect(address.id)}
          />
          <span>
            <strong>
              {address.full_name}
              {address.label && <span className="checkoutTag">{address.label}</span>}
            </strong>
            <span className="checkoutOptionHint">
              {[address.line1, address.line2, address.landmark, address.city, address.state, address.pincode]
                .filter(Boolean)
                .join(", ")}
              <br />
              Phone: {address.phone}
            </span>
          </span>
        </label>
      ))}
      <button type="button" className="checkoutLinkButton" onClick={() => setAdding(true)}>
        + Add a new address
      </button>
    </>
  );
};

const StoreChoice = ({ stores, selected, onSelect }) => (
  <>
    {stores.map((store) => (
      <label key={store.id} className={`checkoutOption ${selected === store.id ? "selected" : ""}`}>
        <input type="radio" name="store" checked={selected === store.id} onChange={() => onSelect(store.id)} />
        <span>
          <strong>{store.name}</strong>
          <span className="checkoutOptionHint">
            {store.address}
            <br />
            Phone: {store.phone}
          </span>
        </span>
      </label>
    ))}
  </>
);

const Summary = ({ quote }) => (
  <>
    <ul className="checkoutLines">
      {quote.lines.map((line) => (
        <li key={line.variant_id}>
          <img src={imageUrl(line.image, 160) ?? undefined} alt="" width={64} height={64} />
          <span>
            {line.product_name}
            <span className="checkoutOptionHint">
              {line.color_name} · Qty {line.quantity}
            </span>
          </span>
          <span>{formatPaise(line.line_total_paise)}</span>
        </li>
      ))}
    </ul>
    <table className="checkoutTotals">
      <tbody>
        <tr>
          <th>Subtotal</th>
          <td>{formatPaise(quote.subtotal_paise)}</td>
        </tr>
        {quote.savings_paise > 0 && (
          <tr>
            <th>You save</th>
            <td className="checkoutSavings">{formatPaise(quote.savings_paise)}</td>
          </tr>
        )}
        <tr>
          <th>Delivery</th>
          <td>{quote.delivery_fee_paise ? formatPaise(quote.delivery_fee_paise) : "Free"}</td>
        </tr>
        <tr className="checkoutGrandTotal">
          <th>Total</th>
          <td>
            {formatPaise(quote.total_paise)}
            <span className="checkoutOptionHint">Includes GST</span>
          </td>
        </tr>
      </tbody>
    </table>
  </>
);

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState(null);
  const idempotencyKey = useRef(newIdempotencyKey());

  const quoteQuery = useGetQuoteQuery(method ?? "UPI", { refetchOnMountOrArgChange: true });
  const quote = quoteQuery.data;
  const [placeOrder, placing] = usePlaceOrderMutation();

  // Default to the first way of paying that's switched on.
  useEffect(() => {
    if (quote && method === null) {
      setMethod(quote.options.upi.enabled ? "UPI" : "PAY_AT_STORE");
    }
  }, [quote, method]);

  if (quoteQuery.isLoading || (quote && method === null)) {
    return (
      <section className="checkoutSection">
        <p role="status">Loading checkout…</p>
      </section>
    );
  }
  if (quoteQuery.isError) {
    return (
      <section className="checkoutSection">
        <FormError>{errorMessage(quoteQuery.error)}</FormError>
        <button type="button" className="checkoutLinkButton" onClick={quoteQuery.refetch}>
          Try again
        </button>
      </section>
    );
  }
  if (!quote.lines.length) {
    return (
      <section className="checkoutSection">
        <h2>Checkout</h2>
        <p>Your cart is empty.</p>
        <Link to="/shop" className="checkoutLinkButton">
          Continue shopping
        </Link>
      </section>
    );
  }

  const { options } = quote;
  const delivery = method === "UPI";
  const ready = !quote.has_issues && (delivery ? addressId !== null : storeId !== null);

  const submit = async () => {
    setProblem(null);
    try {
      const order = await placeOrder({
        idempotencyKey: idempotencyKey.current,
        payment_method: method,
        address_id: delivery ? addressId : null,
        store_id: delivery ? null : storeId,
        customer_note: note.trim() || null,
        expected_total_paise: quote.total_paise,
      }).unwrap();
      navigate(`/orders/${order.order_number}`, { replace: true, state: { justPlaced: true } });
    } catch (err) {
      const code = apiErrorCode(err);
      if (["PRICE_CHANGED", "CART_HAS_ISSUES", "OUT_OF_STOCK"].includes(code)) quoteQuery.refetch();
      setProblem({ code, message: errorMessage(err) });
      if (code === "PRICE_CHANGED") notify.error("Prices changed. Please check the new total.");
    }
  };

  return (
    <section className="checkoutSection">
      <Helmet>
        <title>Checkout – Vijai Opticians</title>
      </Helmet>
      <h2>Checkout</h2>
      {/* Not a <form>: the inline "new address" form sits inside it. */}
      <div className="checkoutBody">
        <div className="checkoutMain">
          <fieldset className="checkoutStep">
            <legend>1. How would you like your order?</legend>
            {options.upi.enabled && (
              <MethodOption
                value="UPI"
                checked={method === "UPI"}
                onChange={setMethod}
                title="Home delivery · pay now by UPI"
              >
                {options.delivery_fee_paise ? `Delivery ${formatPaise(options.delivery_fee_paise)}. ` : "Free delivery. "}
                Pay from any UPI app (Google Pay, PhonePe, Paytm…). We ship once we see your payment.
              </MethodOption>
            )}
            {options.pay_at_store.enabled && (
              <MethodOption
                value="PAY_AT_STORE"
                checked={method === "PAY_AT_STORE"}
                onChange={setMethod}
                title="Pick up at our store · pay there"
              >
                We keep it ready for {options.pay_at_store.hold_days} days. Pay by cash, card or UPI at the
                counter.
              </MethodOption>
            )}
          </fieldset>

          <fieldset className="checkoutStep">
            <legend>{delivery ? "2. Delivery address" : "2. Which store?"}</legend>
            {delivery ? (
              <AddressChoice selected={addressId} onSelect={setAddressId} />
            ) : (
              <StoreChoice stores={options.stores} selected={storeId} onSelect={setStoreId} />
            )}
          </fieldset>

          <fieldset className="checkoutStep">
            <legend>3. Anything we should know? (optional)</legend>
            <label className="visuallyHidden" htmlFor="checkout-note">
              Note for the shop
            </label>
            <textarea
              id="checkout-note"
              className="checkoutNote"
              rows={3}
              maxLength={500}
              placeholder="e.g. call before delivery"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </fieldset>
        </div>

        <aside className="checkoutSummary" aria-label="Order summary">
          <h3>Order summary</h3>
          <Summary quote={quote} />
          {quote.has_issues && (
            <p className="checkoutProblem" role="alert">
              Some items in your cart need your attention. <Link to="/cart">Review your cart</Link>
            </p>
          )}
          {problem && (
            <div className="checkoutProblem" role="alert">
              {problem.message}{" "}
              {["CART_HAS_ISSUES", "OUT_OF_STOCK"].includes(problem.code) && <Link to="/cart">Review your cart</Link>}
              {problem.code === "TOO_MANY_UNPAID" && <Link to="/account/orders">Your orders</Link>}
            </div>
          )}
          <button type="button" className="checkoutPlace" onClick={submit} disabled={!ready || placing.isLoading}>
            {placing.isLoading ? "Placing your order…" : `Place order · ${formatPaise(quote.total_paise)}`}
          </button>
          <p className="checkoutOptionHint">
            {delivery
              ? `Next you'll see our UPI details. We hold your frames for ${options.upi.payment_window_minutes} minutes while you pay.`
              : `We'll hold your frames for ${options.pay_at_store.hold_days} days. Nothing to pay now.`}
          </p>
        </aside>
      </div>
    </section>
  );
};

export default CheckoutPage;
