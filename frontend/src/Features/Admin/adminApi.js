import { baseApi } from "../../Api/baseApi";
import { toQueryString } from "../../Api/query";

// Writes refresh the admin views and the storefront (prices, stock, images).
const CATALOG_WRITE = ["AdminCatalog", "AdminInventory", "Catalog"];
const STOCK_WRITE = ["AdminInventory", "AdminCatalog", "Catalog"];
// Order actions move stock and change what the customer sees.
const ORDER_WRITE = ["AdminOrders", "AdminInventory", "Catalog", "Orders"];

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // products
    listAdminProducts: build.query({
      query: (params) => `/admin/products${toQueryString(params)}`,
      providesTags: ["AdminCatalog"],
    }),
    getAdminProduct: build.query({
      query: (id) => `/admin/products/${id}`,
      providesTags: ["AdminCatalog"],
    }),
    createProduct: build.mutation({
      query: (body) => ({ url: "/admin/products", method: "POST", body }),
      invalidatesTags: CATALOG_WRITE,
    }),
    updateProduct: build.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/products/${id}`, method: "PATCH", body }),
      invalidatesTags: CATALOG_WRITE,
    }),
    setProductStatus: build.mutation({
      query: ({ id, status }) => ({
        url: `/admin/products/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: CATALOG_WRITE,
    }),
    deleteProduct: build.mutation({
      query: (id) => ({ url: `/admin/products/${id}`, method: "DELETE" }),
      invalidatesTags: CATALOG_WRITE,
    }),
    // colours
    createVariant: build.mutation({
      query: ({ productId, ...body }) => ({
        url: `/admin/products/${productId}/variants`,
        method: "POST",
        body,
      }),
      invalidatesTags: CATALOG_WRITE,
    }),
    updateVariant: build.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/variants/${id}`, method: "PATCH", body }),
      invalidatesTags: CATALOG_WRITE,
    }),
    deleteVariant: build.mutation({
      query: (id) => ({ url: `/admin/variants/${id}`, method: "DELETE" }),
      invalidatesTags: CATALOG_WRITE,
    }),
    // images
    uploadSignature: build.mutation({
      query: (productId) => ({
        url: "/admin/uploads/signature",
        method: "POST",
        body: { product_id: productId },
      }),
    }),
    addImage: build.mutation({
      query: ({ productId, ...body }) => ({
        url: `/admin/products/${productId}/images`,
        method: "POST",
        body,
      }),
      invalidatesTags: CATALOG_WRITE,
    }),
    updateImage: build.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/images/${id}`, method: "PATCH", body }),
      invalidatesTags: CATALOG_WRITE,
    }),
    reorderImages: build.mutation({
      query: ({ productId, imageIds }) => ({
        url: `/admin/products/${productId}/images/order`,
        method: "PUT",
        body: { image_ids: imageIds },
      }),
      invalidatesTags: CATALOG_WRITE,
    }),
    deleteImage: build.mutation({
      query: (id) => ({ url: `/admin/images/${id}`, method: "DELETE" }),
      invalidatesTags: CATALOG_WRITE,
    }),
    // categories & brands
    listAdminCategories: build.query({
      query: () => "/admin/categories",
      providesTags: ["AdminCatalog"],
    }),
    createCategory: build.mutation({
      query: (body) => ({ url: "/admin/categories", method: "POST", body }),
      invalidatesTags: CATALOG_WRITE,
    }),
    updateCategory: build.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/categories/${id}`, method: "PATCH", body }),
      invalidatesTags: CATALOG_WRITE,
    }),
    deleteCategory: build.mutation({
      query: (id) => ({ url: `/admin/categories/${id}`, method: "DELETE" }),
      invalidatesTags: CATALOG_WRITE,
    }),
    listAdminBrands: build.query({
      query: () => "/admin/brands",
      providesTags: ["AdminCatalog"],
    }),
    createBrand: build.mutation({
      query: (body) => ({ url: "/admin/brands", method: "POST", body }),
      invalidatesTags: CATALOG_WRITE,
    }),
    updateBrand: build.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/brands/${id}`, method: "PATCH", body }),
      invalidatesTags: CATALOG_WRITE,
    }),
    deleteBrand: build.mutation({
      query: (id) => ({ url: `/admin/brands/${id}`, method: "DELETE" }),
      invalidatesTags: CATALOG_WRITE,
    }),
    // inventory
    listInventory: build.query({
      query: (params) => `/admin/inventory${toQueryString(params)}`,
      providesTags: ["AdminInventory"],
    }),
    lowStock: build.query({
      query: () => "/admin/inventory/low-stock",
      providesTags: ["AdminInventory"],
    }),
    adjustStock: build.mutation({
      query: ({ variantId, ...body }) => ({
        url: `/admin/inventory/${variantId}/adjustments`,
        method: "POST",
        body,
      }),
      invalidatesTags: STOCK_WRITE,
    }),
    markOutOfStock: build.mutation({
      query: ({ variantId, note }) => ({
        url: `/admin/inventory/${variantId}/mark-out-of-stock`,
        method: "POST",
        body: { note },
      }),
      invalidatesTags: STOCK_WRITE,
    }),
    setThreshold: build.mutation({
      query: ({ variantId, threshold }) => ({
        url: `/admin/inventory/${variantId}`,
        method: "PATCH",
        body: { low_stock_threshold: threshold },
      }),
      invalidatesTags: STOCK_WRITE,
    }),
    listTransactions: build.query({
      query: (params) => `/admin/inventory/transactions${toQueryString(params)}`,
      providesTags: ["AdminInventory"],
    }),

    // orders
    listAdminOrders: build.query({
      query: (params) => `/admin/orders${toQueryString(params)}`,
      providesTags: ["AdminOrders"],
    }),
    orderCounts: build.query({
      query: () => "/admin/orders/counts",
      providesTags: ["AdminOrders"],
    }),
    getAdminOrder: build.query({
      query: (orderNumber) => `/admin/orders/${orderNumber}`,
      providesTags: ["AdminOrders"],
    }),
    // action: confirm-payment | reject-payment | collected | status | cancel | refunded
    orderAction: build.mutation({
      query: ({ orderNumber, action, ...body }) => ({
        url: `/admin/orders/${orderNumber}/${action}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ORDER_WRITE,
    }),

    // settings
    getShopSettings: build.query({
      query: () => "/admin/settings",
      providesTags: ["AdminSettings"],
    }),
    updateShopSettings: build.mutation({
      query: (body) => ({ url: "/admin/settings", method: "PATCH", body }),
      invalidatesTags: ["AdminSettings", "Cart"],
    }),
  }),
});

export const {
  useListAdminProductsQuery,
  useGetAdminProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useSetProductStatusMutation,
  useDeleteProductMutation,
  useCreateVariantMutation,
  useUpdateVariantMutation,
  useDeleteVariantMutation,
  useUploadSignatureMutation,
  useAddImageMutation,
  useUpdateImageMutation,
  useReorderImagesMutation,
  useDeleteImageMutation,
  useListAdminCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useListAdminBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  useListInventoryQuery,
  useLowStockQuery,
  useAdjustStockMutation,
  useMarkOutOfStockMutation,
  useSetThresholdMutation,
  useListTransactionsQuery,
  useListAdminOrdersQuery,
  useOrderCountsQuery,
  useGetAdminOrderQuery,
  useOrderActionMutation,
  useGetShopSettingsQuery,
  useUpdateShopSettingsMutation,
} = adminApi;

// Rupees typed in forms <-> paise for the API.
export const rupeesToPaise = (value) => Math.round(Number(value) * 100);
export const paiseToRupees = (paise) => (paise / 100).toString();

export const ENUMS = {
  status: ["DRAFT", "ACTIVE", "INACTIVE"],
  gender: ["UNISEX", "MEN", "WOMEN", "KIDS"],
  frameType: ["FULL_RIM", "HALF_RIM", "RIMLESS"],
  frameShape: ["WAYFARER", "AVIATOR", "ROUND", "RECTANGLE", "SQUARE", "CAT_EYE", "OVAL", "CLUBMASTER", "GEOMETRIC", "WRAP"],
  frameMaterial: ["METAL", "ACETATE", "TR90", "TITANIUM", "PLASTIC", "MIXED"],
  colorFamily: ["BLACK", "BROWN", "TORTOISE", "GOLD", "ROSE_GOLD", "SILVER", "GUNMETAL", "GREY", "WHITE", "BLUE", "GREEN", "PINK", "RED", "PURPLE", "TRANSPARENT", "MULTI"],
  adjustment: ["RESTOCK", "ADJUSTMENT", "DAMAGE", "CORRECTION"],
};

export const enumLabel = (value) =>
  value ? value.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) : "—";
