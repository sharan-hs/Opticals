import React from "react";
import { Route } from "react-router-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import LoginPage from "../../Components/Authentication/LoginPage";
import { accountApi } from "../Account/accountApi";
import { makeStore } from "../../App/store";
import { RequireAuth, safeNextPath } from "./guards";
import { applyFieldErrors, errorMessage } from "../../Api/errors";
import { API, server } from "../../test/server";
import { renderApp, signedIn } from "../../test/render";

const USER = { id: 1, email: "asha@example.com", full_name: "Asha Rao", phone: null, role: "CUSTOMER" };
const session = (token) => ({ user: USER, access_token: token, token_type: "bearer", expires_in: 900 });
const apiError = (status, code, message) =>
  HttpResponse.json({ error: { code, message }, request_id: "t" }, { status });

describe("login page", () => {
  it("signs in and goes to the ?next= page", async () => {
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json(session("abc"))));
    const { store } = renderApp(
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account/addresses" element={<p>Addresses page</p>} />
      </>,
      { path: "/login?next=/account/addresses" }
    );

    await userEvent.type(screen.getByLabelText("Email address"), "asha@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Specs-and-frames-2026");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Addresses page")).toBeInTheDocument();
    expect(store.getState().auth).toMatchObject({ status: "authenticated", accessToken: "abc" });
  });

  it("shows the API's message when the password is wrong", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        apiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.")
      )
    );
    renderApp(<Route path="/login" element={<LoginPage />} />, { path: "/login" });

    await userEvent.type(screen.getByLabelText("Email address"), "asha@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });

  it("validates before calling the API", async () => {
    renderApp(<Route path="/login" element={<LoginPage />} />, { path: "/login" });
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Enter your email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
  });
});

describe("expired access token", () => {
  it("refreshes once for concurrent requests, then retries them", async () => {
    let refreshCalls = 0;
    server.use(
      http.post(`${API}/auth/refresh`, ({ request }) => {
        refreshCalls += 1;
        expect(request.headers.get("X-Requested-With")).toBe("fetch");
        return HttpResponse.json(session("fresh-token"));
      }),
      http.get(`${API}/me/addresses`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer fresh-token"
          ? HttpResponse.json([])
          : apiError(401, "TOKEN_EXPIRED", "Your session has expired.")
      ),
      http.patch(`${API}/me`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer fresh-token"
          ? HttpResponse.json(USER)
          : apiError(401, "TOKEN_EXPIRED", "Your session has expired.")
      )
    );
    const store = makeStore(signedIn("stale-token"));

    const [addresses, profile] = await Promise.all([
      store.dispatch(accountApi.endpoints.getAddresses.initiate()),
      store.dispatch(accountApi.endpoints.updateProfile.initiate({ full_name: "Asha Rao" })),
    ]);

    expect(addresses.data).toEqual([]);
    expect(profile.data).toEqual(USER);
    expect(refreshCalls).toBe(1);
    expect(store.getState().auth.accessToken).toBe("fresh-token");
  });

  it("signs out when the refresh cookie is no longer valid", async () => {
    server.use(
      http.post(`${API}/auth/refresh`, () => apiError(401, "SESSION_EXPIRED", "Please sign in again.")),
      http.get(`${API}/me/addresses`, () => apiError(401, "TOKEN_EXPIRED", "Expired"))
    );
    const store = makeStore(signedIn("stale-token"));

    const result = await store.dispatch(accountApi.endpoints.getAddresses.initiate());

    expect(result.error.status).toBe(401);
    expect(store.getState().auth).toMatchObject({ status: "anonymous", accessToken: null });
  });
});

describe("guards and helpers", () => {
  it("sends signed-out visitors to login with ?next=", () => {
    renderApp(
      <>
        <Route path="/account/addresses" element={<RequireAuth>Secret</RequireAuth>} />
        <Route path="/login" element={<p>Login page</p>} />
      </>,
      { path: "/account/addresses", preloadedState: { auth: { status: "anonymous", user: null, accessToken: null } } }
    );
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("only follows same-site ?next= paths", () => {
    expect(safeNextPath("/account/addresses")).toBe("/account/addresses");
    expect(safeNextPath("https://evil.example")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(safeNextPath(null)).toBe("/account");
  });

  it("maps API validation errors onto form fields", () => {
    const setError = vi.fn();
    const error = {
      status: 422,
      data: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Some fields are invalid.",
          details: [{ field: "password", message: "Value error, This password is too easy to guess" }],
        },
      },
    };
    expect(applyFieldErrors(error, setError, ["password"])).toBe(true);
    expect(setError).toHaveBeenCalledWith("password", {
      type: "server",
      message: "This password is too easy to guess",
    });
    expect(errorMessage({ status: "FETCH_ERROR" })).toMatch("Can't reach the server");
  });
});
