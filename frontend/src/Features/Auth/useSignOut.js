import { useNavigate } from "react-router-dom";

import { notify } from "../../Utils/notify";
import { useLogoutMutation } from "./authApi";

// Logs out this browser (the session ends locally even if the request fails).
export const useSignOut = () => {
  const [logout, { isLoading }] = useLogoutMutation();
  const navigate = useNavigate();
  const signOut = async () => {
    await logout().catch(() => {});
    notify.success("You’ve been logged out");
    navigate("/", { replace: true });
  };
  return [signOut, isLoading];
};
