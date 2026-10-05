import { baseApi } from "../../Api/baseApi";

// Every cart endpoint answers with the whole priced cart, which replaces the
// cached one (or creates it); there's no second request to refresh it.
const storeCart = (dispatch, cart) => dispatch(cartApi.util.upsertQueryData("getCart", undefined, cart));

const storeOnSuccess = async (_, { dispatch, queryFulfilled }) => {
  try {
    const { data } = await queryFulfilled;
    storeCart(dispatch, data);
  } catch {
    // The caller reports the error.
  }
};

// Shows a change at once and puts it back if the server refuses it.
const optimistic = (change) => async (arg, { dispatch, queryFulfilled }) => {
  const patch = dispatch(cartApi.util.updateQueryData("getCart", undefined, (draft) => change(draft, arg)));
  try {
    const { data } = await queryFulfilled;
    storeCart(dispatch, data);
  } catch {
    patch.undo();
  }
};

export const cartApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query({
      query: () => "/cart",
      providesTags: ["Cart"],
    }),
    addCartItem: build.mutation({
      query: ({ variantId, quantity }) => ({
        url: "/cart/items",
        method: "POST",
        body: { variant_id: variantId, quantity },
      }),
      onQueryStarted: storeOnSuccess,
    }),
    setCartQuantity: build.mutation({
      query: ({ variantId, quantity }) => ({
        url: `/cart/items/${variantId}`,
        method: "PATCH",
        body: { quantity },
      }),
      onQueryStarted: optimistic((draft, { variantId, quantity }) => {
        const line = draft.lines.find((l) => l.variant_id === variantId);
        if (!line) return;
        draft.item_count += quantity - line.quantity;
        line.quantity = quantity;
        line.line_total_paise = line.unit_price_paise * quantity;
      }),
    }),
    removeCartItem: build.mutation({
      query: (variantId) => ({ url: `/cart/items/${variantId}`, method: "DELETE" }),
      onQueryStarted: optimistic((draft, variantId) => {
        const line = draft.lines.find((l) => l.variant_id === variantId);
        if (!line) return;
        draft.item_count -= line.quantity;
        draft.lines = draft.lines.filter((l) => l !== line);
      }),
    }),
    clearCart: build.mutation({
      query: () => ({ url: "/cart", method: "DELETE" }),
      invalidatesTags: ["Cart"],
    }),
    // Guest cart → the signed-in user's cart (right after sign-in).
    mergeCart: build.mutation({
      query: (items) => ({ url: "/cart/merge", method: "POST", body: { items } }),
      onQueryStarted: storeOnSuccess,
    }),
    // Prices a guest cart; nothing is stored.
    previewCart: build.query({
      query: (items) => ({ url: "/cart/preview", method: "POST", body: { items } }),
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddCartItemMutation,
  useSetCartQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
  useMergeCartMutation,
  usePreviewCartQuery,
} = cartApi;
