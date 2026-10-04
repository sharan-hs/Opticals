import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { FormError } from "../Components/Form/Form";
import { errorMessage } from "../Api/errors";
import {
  useAdjustStockMutation,
  useMarkOutOfStockMutation,
  useSetThresholdMutation,
} from "../Features/Admin/adminApi";
import { notify } from "../Utils/notify";

const TYPES = {
  RESTOCK: { label: "Restock (stock arrived)", sign: 1 },
  ADJUSTMENT: { label: "Count correction (+ or −)", sign: 0 },
  DAMAGE: { label: "Damaged / lost", sign: -1 },
  CORRECTION: { label: "Fix a previous mistake (+ or −)", sign: 0 },
};

// Restock / adjust one colour. `row` has variant_id, sku, color_name,
// product_name, on_hand, reserved, available, low_stock_threshold.
const StockDialog = ({ row, open, onClose }) => {
  const [type, setType] = useState("RESTOCK");
  const [direction, setDirection] = useState(1);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [threshold, setThreshold] = useState(String(row.low_stock_threshold));
  const [adjust, adjustState] = useAdjustStockMutation();
  const [markOut, markOutState] = useMarkOutOfStockMutation();
  const [saveThreshold, thresholdState] = useSetThresholdMutation();

  const sign = TYPES[type].sign || direction;
  const amount = Number.parseInt(quantity, 10);
  const delta = Number.isFinite(amount) && amount > 0 ? sign * amount : 0;
  const after = row.on_hand + delta;
  const error = adjustState.error || markOutState.error || thresholdState.error;

  const submit = async (event) => {
    event.preventDefault();
    try {
      await adjust({ variantId: row.variant_id, type, quantity_delta: delta, note: note || null }).unwrap();
      notify.success(`${row.sku}: on hand ${row.on_hand} → ${after}`);
      onClose();
    } catch {
      // shown in the dialog
    }
  };

  const markOutOfStock = async () => {
    if (!note.trim()) {
      notify.error("Add a note first (why is it out of stock?)");
      return;
    }
    try {
      await markOut({ variantId: row.variant_id, note }).unwrap();
      notify.success(`${row.sku} marked out of stock`);
      onClose();
    } catch {
      // shown in the dialog
    }
  };

  const updateThreshold = async () => {
    try {
      await saveThreshold({ variantId: row.variant_id, threshold: Number(threshold) }).unwrap();
      notify.success("Low-stock alert level saved");
    } catch {
      // shown in the dialog
    }
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="stock-title" maxWidth="sm" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle id="stock-title">
          Stock · {row.product_name} – {row.color_name}
          <div className="muted">{row.sku}</div>
        </DialogTitle>
        <DialogContent>
          <div className="adminSummary">
            <div>
              On hand <strong>{row.on_hand}</strong>
            </div>
            <div>
              Held by unpaid orders <strong>{row.reserved}</strong>
            </div>
            <div>
              Available <strong>{row.available}</strong>
            </div>
          </div>
          <FormError>{error ? errorMessage(error) : null}</FormError>
          <div className="adminGrid">
            <label className="adminField">
              Change
              <select className="adminSelect" value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(TYPES).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {TYPES[type].sign === 0 && (
              <label className="adminField">
                Direction
                <select className="adminSelect" value={direction} onChange={(e) => setDirection(Number(e.target.value))}>
                  <option value={1}>Add</option>
                  <option value={-1}>Remove</option>
                </select>
              </label>
            )}
            <label className="adminField">
              Quantity
              <input
                className="adminInput"
                type="number"
                inputMode="numeric"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </label>
          </div>
          <label className="adminField" style={{ marginTop: 14 }}>
            Note {type === "RESTOCK" ? "(optional, e.g. supplier invoice no.)" : "(required)"}
            <input className="adminInput" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </label>
          {delta !== 0 && (
            <p className="muted" style={{ marginTop: 10 }}>
              On hand will be <strong>{after}</strong> ({delta > 0 ? "+" : ""}
              {delta}).
            </p>
          )}
          <div className="adminFormActions" style={{ borderTop: "1px solid #eee", paddingTop: 14 }}>
            <label className="adminField" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              Low-stock alert at
              <input
                className="adminInput"
                type="number"
                min={0}
                style={{ width: 80 }}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </label>
            <button type="button" className="adminButton secondary small" onClick={updateThreshold}>
              Save level
            </button>
          </div>
        </DialogContent>
        <DialogActions>
          <button type="button" className="adminButton secondary" onClick={markOutOfStock} disabled={row.available <= 0}>
            Mark out of stock
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="adminButton secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="adminButton" disabled={delta === 0 || adjustState.isLoading}>
            Save change
          </button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StockDialog;
