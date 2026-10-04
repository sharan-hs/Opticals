import { baseApi, CSRF_HEADERS, refreshSession } from "../../Api/baseApi";
import { sessionEnded, sessionStarted } from "./authSlice";

const startSessionOnSuccess = async (_, { dispatch, queryFulfilled }) => {
  try {
    const { data } = await queryFulfilled;
    dispatch(sessionStarted(data));
  } catch {
    // The calling form shows the error.
  }
};

// Clears the session and every cached response that belonged to the user.
const endSession = async (_, { dispatch, queryFulfilled }) => {
  try {
    await queryFulfilled;
  } finally {
    dispatch(sessionEnded());
    dispatch(baseApi.util.resetApiState());
  }
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      onQueryStarted: startSessionOnSuccess,
    }),
    login: build.mutation({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      onQueryStarted: startSessionOnSuccess,
    }),
    // Restores the session from the refresh cookie (app start).
    restoreSession: build.mutation({
      queryFn: (_arg, api, extraOptions) => refreshSession(api, extraOptions),
    }),
    logout: build.mutation({
      query: () => ({ url: "/auth/logout", method: "POST", headers: CSRF_HEADERS }),
      onQueryStarted: endSession,
    }),
    logoutAll: build.mutation({
      query: () => ({ url: "/auth/logout-all", method: "POST" }),
      onQueryStarted: endSession,
    }),
    changePassword: build.mutation({
      query: (body) => ({ url: "/auth/change-password", method: "POST", body }),
    }),
    forgotPassword: build.mutation({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
    }),
    resetPassword: build.mutation({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useRestoreSessionMutation,
  useLogoutMutation,
  useLogoutAllMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
