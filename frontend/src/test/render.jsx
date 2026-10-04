import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { makeStore } from "../App/store";

// Renders `routes` inside a fresh store and an in-memory router.
export const renderApp = (routes, { path = "/", preloadedState } = {}) => {
  const store = makeStore(preloadedState);
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {routes}
          <Route path="*" element={<p>Other page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return { store, ...utils };
};

export const signedIn = (token = "valid-token") => ({
  auth: {
    status: "authenticated",
    accessToken: token,
    user: { id: 1, email: "asha@example.com", full_name: "Asha Rao", phone: null, role: "CUSTOMER" },
  },
});
