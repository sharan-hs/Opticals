const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPaiseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Rupees (filters, sliders).
export const formatINR = (amount) => inrFormatter.format(amount);

// The API sends money as integer paise: 1249000 -> "₹12,490".
export const formatPaise = (paise) => inrPaiseFormatter.format(paise / 100);

// Dates are shown in Indian time whatever the device's clock says.
const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export const formatDateTime = (iso) => (iso ? dateTimeFormatter.format(new Date(iso)) : "");
export const formatDate = (iso) => (iso ? dateFormatter.format(new Date(iso)) : "");
