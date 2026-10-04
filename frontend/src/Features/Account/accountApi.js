import { baseApi } from "../../Api/baseApi";
import { userUpdated } from "../Auth/authSlice";

export const accountApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    updateProfile: build.mutation({
      query: (body) => ({ url: "/me", method: "PATCH", body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userUpdated(data));
        } catch {
          // Shown by the form.
        }
      },
    }),
    getAddresses: build.query({
      query: () => "/me/addresses",
      providesTags: ["Addresses"],
    }),
    createAddress: build.mutation({
      query: (body) => ({ url: "/me/addresses", method: "POST", body }),
      invalidatesTags: ["Addresses"],
    }),
    updateAddress: build.mutation({
      query: ({ id, ...body }) => ({ url: `/me/addresses/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Addresses"],
    }),
    deleteAddress: build.mutation({
      query: (id) => ({ url: `/me/addresses/${id}`, method: "DELETE" }),
      invalidatesTags: ["Addresses"],
    }),
    setDefaultAddress: build.mutation({
      query: (id) => ({ url: `/me/addresses/${id}/default`, method: "POST" }),
      invalidatesTags: ["Addresses"],
    }),
  }),
});

export const {
  useUpdateProfileMutation,
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
} = accountApi;
