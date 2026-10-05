import React, { useEffect, useState } from "react";

import { PageHeader, QueryState } from "./components";
import UpiQr from "../Components/Orders/UpiQr";
import { FormError } from "../Components/Form/Form";
import { errorMessage } from "../Api/errors";
import { paiseToRupees, rupeesToPaise, useGetShopSettingsQuery, useUpdateShopSettingsMutation } from "../Features/Admin/adminApi";
import { notify } from "../Utils/notify";
import useDocumentTitle from "../Utils/useDocumentTitle";

const PLACEHOLDER_UPI_ID = "vijaiopticians@example";

const toForm = (s) => ({
  upi_enabled: s.upi_enabled,
  upi_id: s.upi_id === PLACEHOLDER_UPI_ID ? "" : s.upi_id,
  upi_payee_name: s.upi_payee_name,
  upi_payment_window_minutes: String(s.upi_payment_window_minutes),
  pay_at_store_enabled: s.pay_at_store_enabled,
  pickup_hold_days: String(s.pickup_hold_days),
  delivery_fee: paiseToRupees(s.delivery_fee_paise),
  gst_rate_percent: String(s.gst_rate_percent),
  order_email: s.order_email ?? "",
});

// Only fields that changed are sent.
const toChanges = (form, saved) => {
  const next = {
    upi_enabled: form.upi_enabled,
    upi_payee_name: form.upi_payee_name.trim(),
    upi_payment_window_minutes: Number(form.upi_payment_window_minutes),
    pay_at_store_enabled: form.pay_at_store_enabled,
    pickup_hold_days: Number(form.pickup_hold_days),
    delivery_fee_paise: rupeesToPaise(form.delivery_fee || 0),
    gst_rate_percent: Number(form.gst_rate_percent),
    order_email: form.order_email.trim() || null,
  };
  if (form.upi_id.trim()) next.upi_id = form.upi_id.trim();
  return Object.fromEntries(Object.entries(next).filter(([key, value]) => saved[key] !== value));
};

const Field = ({ label, hint, children }) => (
  <label className="adminField">
    {label}
    {children}
    {hint && <span className="muted" style={{ fontWeight: 400 }}>{hint}</span>}
  </label>
);

const Toggle = ({ label, checked, onChange }) => (
  <label className="adminField" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
);

const SettingsPage = () => {
  useDocumentTitle("Admin · Settings");
  const query = useGetShopSettingsQuery();
  const [save, saveState] = useUpdateShopSettingsMutation();
  const [form, setForm] = useState(null);
  const saved = query.data;

  useEffect(() => {
    if (saved) setForm(toForm(saved));
  }, [saved]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const input = (key) => (event) => set(key)(event.target.value);
  const placeholder = saved?.upi_id === PLACEHOLDER_UPI_ID;
  const previewId = form?.upi_id.trim() || saved?.upi_id;
  const previewUri = previewId
    ? `upi://pay?pa=${encodeURIComponent(previewId)}&pn=${encodeURIComponent(form?.upi_payee_name ?? "")}&cu=INR`
    : null;

  const submit = async (event) => {
    event.preventDefault();
    const changes = toChanges(form, saved);
    if (Object.keys(changes).length === 0) {
      notify.success("Nothing to save");
      return;
    }
    try {
      await save(changes).unwrap();
      notify.success("Settings saved");
    } catch {
      // shown in the form
    }
  };

  return (
    <QueryState query={query}>
      {form && (
        <form onSubmit={submit}>
          <PageHeader title="Settings">
            <button type="submit" className="adminButton" disabled={saveState.isLoading}>
              Save settings
            </button>
          </PageHeader>
          <FormError>{saveState.error ? errorMessage(saveState.error) : null}</FormError>

          <section className="adminCard">
            <h2>UPI payments (home delivery)</h2>
            {placeholder && (
              <p className="adminNotice" role="status">
                No UPI ID is set yet. Customers currently see a dummy ID that can’t receive money. Enter the shop’s
                UPI ID below before taking real orders.
              </p>
            )}
            <Toggle label="Offer “Home delivery · pay by UPI” at checkout" checked={form.upi_enabled} onChange={set("upi_enabled")} />
            <div className="adminGrid" style={{ marginTop: 12 }}>
              <Field label="UPI ID" hint="From the owner’s UPI app, e.g. 9731307237@ybl or vijaiopticians@okhdfcbank">
                <input
                  className="adminInput"
                  value={form.upi_id}
                  placeholder={PLACEHOLDER_UPI_ID}
                  onChange={input("upi_id")}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Name shown to customers" hint="Should match the name on the UPI account">
                <input className="adminInput" value={form.upi_payee_name} onChange={input("upi_payee_name")} />
              </Field>
              <Field label="Time to pay (minutes)" hint="Unpaid orders are cancelled after this">
                <input
                  className="adminInput"
                  type="number"
                  min={10}
                  max={1440}
                  value={form.upi_payment_window_minutes}
                  onChange={input("upi_payment_window_minutes")}
                />
              </Field>
              <Field label="Delivery fee (₹)" hint="0 = free delivery">
                <input className="adminInput" type="number" min={0} step="1" value={form.delivery_fee} onChange={input("delivery_fee")} />
              </Field>
            </div>
            {previewUri && (
              <div className="adminUpiPreview">
                <UpiQr uri={previewUri} size={140} />
                <p className="muted">
                  Test it: scan this with a UPI app. It should show <strong>{previewId}</strong> and the account holder’s
                  name. Don’t complete a payment. (Save first if you changed the ID.)
                </p>
              </div>
            )}
          </section>

          <section className="adminCard">
            <h2>Pay at store (pickup)</h2>
            <Toggle
              label="Offer “Pick up at our store · pay there” at checkout"
              checked={form.pay_at_store_enabled}
              onChange={set("pay_at_store_enabled")}
            />
            <div className="adminGrid" style={{ marginTop: 12 }}>
              <Field label="Hold for (days)" hint="Uncollected orders are cancelled after this">
                <input
                  className="adminInput"
                  type="number"
                  min={1}
                  max={14}
                  value={form.pickup_hold_days}
                  onChange={input("pickup_hold_days")}
                />
              </Field>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              Stores customers can choose: {saved.stores.map((s) => s.name).join(", ")}.
            </p>
          </section>

          <section className="adminCard">
            <h2>Orders</h2>
            <div className="adminGrid">
              <Field label="Email new orders to" hint="Leave empty to stop these emails">
                <input className="adminInput" type="email" value={form.order_email} onChange={input("order_email")} />
              </Field>
              <Field label="GST rate (%)" hint="Only used to show the GST inside each total. Check with your accountant.">
                <input
                  className="adminInput"
                  type="number"
                  min={0}
                  max={28}
                  value={form.gst_rate_percent}
                  onChange={input("gst_rate_percent")}
                />
              </Field>
            </div>
          </section>
        </form>
      )}
    </QueryState>
  );
};

export default SettingsPage;
