import { baseApi } from "../../Api/baseApi";
import { toQueryString } from "../../Api/query";

// Order and stock writes also refresh the cart, the shop's stock badges and
// the admin views.
const ORDER_WRITE = ["Orders", "Cart", "Catalog", "AdminOrders", "AdminInventory"];

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // The cart priced for checkout, plus the ways to pay and the stores.
    getQuote: build.query({
      query: (paymentMethod) => ({
        url: "/checkout/quote",
        method: "POST",
        body: { payment_method: paymentMethod },
      }),
      providesTags: ["Cart"],
    }),
    // `idempotencyKey` is made once per checkout attempt, so a retry or a
    // double click returns the same order instead of a second one.
    placeOrder: build.mutation({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/orders",
        method: "POST",
        body,
        headers: { "Idempotency-Key": idempotencyKey },
      }),
      invalidatesTags: ORDER_WRITE,
    }),
    listOrders: build.query({
      query: (params = {}) => `/orders${toQueryString(params)}`,
      providesTags: ["Orders"],
    }),
    getOrder: build.query({
      query: (orderNumber) => `/orders/${orderNumber}`,
      providesTags: ["Orders"],
    }),
    reportPayment: build.mutation({
      query: ({ orderNumber, reference }) => ({
        url: `/orders/${orderNumber}/payment`,
        method: "POST",
        body: { reference },
      }),
      invalidatesTags: ["Orders", "AdminOrders"],
    }),
    cancelOrder: build.mutation({
      query: ({ orderNumber, reason }) => ({
        url: `/orders/${orderNumber}/cancel`,
        method: "POST",
        body: { reason: reason || null },
      }),
      invalidatesTags: ORDER_WRITE,
    }),
  }),
});

export const {
  useGetQuoteQuery,
  usePlaceOrderMutation,
  useListOrdersQuery,
  useGetOrderQuery,
  useReportPaymentMutation,
  useCancelOrderMutation,
} = ordersApi;

// Wording shared by the customer and admin pages.
export const ORDER_STATUS_LABELS = {
  PENDING_PAYMENT: "Waiting for payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS = {
  UNPAID: "Not paid",
  VERIFYING: "Checking payment",
  PAID: "Paid",
  REFUND_PENDING: "Refund due",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
  FAILED: "Payment not received",
};

// What the customer sees as the order's headline status.
export const customerStatus = (order) => {
  if (order.status === "PENDING_PAYMENT") {
    if (order.fulfilment === "PICKUP") return "Ready to collect";
    return order.payment_status === "VERIFYING" ? "Checking your payment" : "Waiting for payment";
  }
  if (order.status === "DELIVERED" && order.fulfilment === "PICKUP") return "Collected";
  return ORDER_STATUS_LABELS[order.status] ?? order.status;
};
