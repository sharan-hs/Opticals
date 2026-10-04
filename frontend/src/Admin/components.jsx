import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { imageUrl } from "../Utils/cloudinary";
import { enumLabel } from "../Features/Admin/adminApi";

const STOCK_LABELS = { in_stock: "In stock", low: "Low", out: "Out" };

export const StockBadge = ({ status, children }) => (
  <span className={`stockBadge ${status}`}>
    {STOCK_LABELS[status]}
    {children !== undefined && <> · {children}</>}
  </span>
);

export const StatusPill = ({ status }) => (
  <span className={`statusPill ${status.toLowerCase()}`}>{enumLabel(status)}</span>
);

export const Thumb = ({ image, size = 56 }) =>
  image ? (
    <img className="adminThumb" src={imageUrl(image, size * 2)} alt="" width={size} height={size} />
  ) : (
    <span className="adminThumb empty" style={{ width: size, height: size }} />
  );

export const PageHeader = ({ title, children }) => (
  <header className="adminPageHeader">
    <h1>{title}</h1>
    <div className="adminPageActions">{children}</div>
  </header>
);

export const Pagination = ({ page, totalPages, onPage }) =>
  totalPages > 1 ? (
    <nav className="adminPagination" aria-label="Pagination">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
        Next
      </button>
    </nav>
  ) : null;

// Accessible modal for destructive or important actions.
export const ConfirmDialog = ({ open, title, children, confirmLabel = "Confirm", danger, busy, onConfirm, onClose }) => (
  <Dialog open={open} onClose={onClose} aria-labelledby="confirm-title" maxWidth="xs" fullWidth>
    <DialogTitle id="confirm-title">{title}</DialogTitle>
    <DialogContent>{children}</DialogContent>
    <DialogActions>
      <button type="button" className="adminButton secondary" onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        className={`adminButton ${danger ? "danger" : ""}`}
        onClick={onConfirm}
        disabled={busy}
      >
        {confirmLabel}
      </button>
    </DialogActions>
  </Dialog>
);

export const QueryState = ({ query, children }) => {
  if (query.isLoading) return <p role="status">Loading…</p>;
  if (query.isError) {
    return (
      <div className="formError" role="alert">
        Couldn’t load this. <button type="button" className="linkAction" onClick={query.refetch}>Try again</button>
      </div>
    );
  }
  return children;
};
