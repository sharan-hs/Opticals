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
