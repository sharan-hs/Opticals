import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { sessionEnded, sessionStarted } from "../Features/Auth/authSlice";

// Same origin in every environment: Vite (dev) and Vercel (production)
// forward /api to the backend.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

// Cookie-authenticated endpoints require this header (CSRF protection).
export const CSRF_HEADERS = { "X-Requested-With": "fetch" };

const REFRESH_REQUEST = { url: "/auth/refresh", method: "POST", headers: CSRF_HEADERS };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let refreshInFlight = null;

// Exchanges the refresh cookie for a new access token. Concurrent callers
// share one request, so a burst of 401s triggers a single refresh.
export const refreshSession = (api, extraOptions) => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      let result = await rawBaseQuery(REFRESH_REQUEST, api, extraOptions);
      // Another tab refreshed at the same moment; the browser now holds the
      // newer cookie, so one retry succeeds.
      if (result.error?.data?.error?.code === "REFRESH_RACE") {
        await wait(300);
        result = await rawBaseQuery(REFRESH_REQUEST, api, extraOptions);
      }
      api.dispatch(result.data ? sessionStarted(result.data) : sessionEnded());
      return result;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

const NO_REFRESH_RETRY = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"]);

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const url = typeof args === "string" ? args : args.url;
  const expired =
    result.error?.status === 401 &&
    !NO_REFRESH_RETRY.has(url) &&
    api.getState().auth.accessToken;
  if (expired) {
    const refreshed = await refreshSession(api, extraOptions);
    if (refreshed.data) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Me", "Addresses", "Catalog", "AdminCatalog", "AdminInventory"],
  endpoints: () => ({}),
});
