import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { FormError, SubmitButton, TextField } from "../Form/Form";
import { applyFieldErrors, apiErrorCode, errorMessage } from "../../Api/errors";
import { useChangePasswordMutation, useLogoutAllMutation } from "../../Features/Auth/authApi";
import { changePasswordSchema } from "../../Features/Auth/schemas";
import { notify } from "../../Utils/notify";
import useDocumentTitle from "../../Utils/useDocumentTitle";

const EMPTY = { current_password: "", new_password: "", confirm_password: "" };

const SecurityPage = () => {
  useDocumentTitle("Password & Security");
  const navigate = useNavigate();
  const [changePassword, { isLoading, error, reset }] = useChangePasswordMutation();
  const [logoutAll, { isLoading: signingOut }] = useLogoutAllMutation();
  const {
    register,
    handleSubmit,
    setError,
    reset: resetForm,
    formState: { errors },
  } = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: EMPTY });

  const onSubmit = async ({ current_password, new_password }) => {
    try {
      await changePassword({ current_password, new_password }).unwrap();
      resetForm(EMPTY);
      notify.success("Password changed. Other devices have been signed out.");
    } catch (err) {
      if (apiErrorCode(err) === "WRONG_PASSWORD") {
        setError("current_password", { type: "server", message: errorMessage(err) });
        reset();
      } else if (applyFieldErrors(err, setError, ["current_password", "new_password"])) {
        reset();
      }
    }
  };

  const signOutEverywhere = async () => {
    if (!window.confirm("Log out on all devices, including this one?")) return;
    await logoutAll().catch(() => {});
    notify.success("Logged out on all devices");
    navigate("/login", { replace: true });
  };

  return (
    <div className="accountPanel">
      <h3>Change password</h3>
      <form className="accountForm" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormError>{errorMessage(error)}</FormError>
        <TextField
          id="security-current"
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.current_password?.message}
          {...register("current_password")}
        />
        <TextField
          id="security-new"
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          error={errors.new_password?.message}
          {...register("new_password")}
        />
        <TextField
          id="security-confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />
        <SubmitButton loading={isLoading}>Change password</SubmitButton>
      </form>

      <div className="accountDivider" />
      <h3>Devices</h3>
      <p className="accountText">
        Lost a phone or used a shared computer? Log out everywhere you’re signed in.
      </p>
      <button
        type="button"
        className="secondaryButton"
        onClick={signOutEverywhere}
        disabled={signingOut}
      >
        Log out on all devices
      </button>
    </div>
  );
};

export default SecurityPage;
