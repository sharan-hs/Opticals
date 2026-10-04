import { baseApi } from "../../Api/baseApi";
import { toQueryString } from "../../Api/query";

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query({
      query: (params = {}) => `/products${toQueryString(params)}`,
      providesTags: ["Catalog"],
    }),
    getFacets: build.query({
      query: (params = {}) => `/products/facets${toQueryString(params)}`,
      providesTags: ["Catalog"],
    }),
    getProduct: build.query({
      query: (slug) => `/products/${encodeURIComponent(slug)}`,
      providesTags: ["Catalog"],
    }),
    getRelatedProducts: build.query({
      query: ({ slug, limit = 8 }) =>
        `/products/${encodeURIComponent(slug)}/related${toQueryString({ limit })}`,
      providesTags: ["Catalog"],
    }),
    getCategories: build.query({ query: () => "/categories", providesTags: ["Catalog"] }),
    getBrands: build.query({ query: () => "/brands", providesTags: ["Catalog"] }),
  }),
});

export const {
  useGetProductsQuery,
  useGetFacetsQuery,
  useGetProductQuery,
  useGetRelatedProductsQuery,
  useGetCategoriesQuery,
  useGetBrandsQuery,
} = catalogApi;
