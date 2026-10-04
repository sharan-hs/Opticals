import { createSlice } from "@reduxjs/toolkit";

// The access token lives only in memory (never localStorage). After a reload
// the session is restored from the httpOnly refresh cookie.
// status: "unknown" until the first restore attempt finishes.
const initialState = {
  user: null,
  accessToken: null,
  status: "unknown",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionStarted(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.access_token;
      state.status = "authenticated";
    },
    userUpdated(state, action) {
      state.user = action.payload;
    },
    sessionEnded(state) {
      state.user = null;
      state.accessToken = null;
      state.status = "anonymous";
    },
  },
});

export const { sessionStarted, userUpdated, sessionEnded } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectAuthStatus = (state) => state.auth.status;
export const selectIsAuthenticated = (state) => state.auth.status === "authenticated";

export default authSlice.reducer;
