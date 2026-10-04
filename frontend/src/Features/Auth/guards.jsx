import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import PageLoading from "../../Components/PageLoading/PageLoading";
import { useRestoreSessionMutation } from "./authApi";
import { selectAuthStatus, selectCurrentUser } from "./authSlice";

// Only same-site paths, so ?next= can't send people to another website.
export const safeNextPath = (next, fallback = "/account") =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;

// Runs once at app start: a valid refresh cookie signs the visitor back in.
export const useSessionRestore = () => {
  const status = useSelector(selectAuthStatus);
  const [restore] = useRestoreSessionMutation();
  useEffect(() => {
    if (status === "unknown") restore();
    // Only on first mount; later changes come from login/logout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

// The backend enforces access; these guards only decide what to render.
export const RequireAuth = ({ children }) => {
  const status = useSelector(selectAuthStatus);
  const location = useLocation();
  if (status === "unknown") return <PageLoading />;
  if (status !== "authenticated") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
};

export const RequireRole = ({ roles, children }) => {
  const user = useSelector(selectCurrentUser);
  return (
    <RequireAuth>
      {user && roles.includes(user.role) ? (
        children
      ) : (
        <div className="pageLoading">
          <p role="alert">You don’t have access to this page.</p>
        </div>
      )}
    </RequireAuth>
  );
};
