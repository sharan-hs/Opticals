import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AuthLayout from "./AuthLayout";
import { FormError, SubmitButton, TextField } from "../Form/Form";
import { applyFieldErrors, errorMessage } from "../../Api/errors";
import { useResetPasswordMutation } from "../../Features/Auth/authApi";
import { resetPasswordSchema } from "../../Features/Auth/schemas";
import { notify } from "../../Utils/notify";
import useDocumentTitle from "../../Utils/useDocumentTitle";

// Opened from the emailed link: /reset-password?token=...
const ResetPasswordPage = () => {
  useDocumentTitle("Choose a New Password");
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  if (!token) {
    return (
      <AuthLayout title="Choose a new password">
        <p className="formNotice" role="alert">
          This link is incomplete. Open the link from your email again, or{" "}
          <Link to="/forgot-password">request a new one</Link>.
        </p>
      </AuthLayout>
    );
  }

  const onSubmit = async ({ new_password }) => {
    try {
      await resetPassword({ token, new_password }).unwrap();
      notify.success("Password changed. Please log in.");
      navigate("/login", { replace: true });
    } catch (err) {
      applyFieldErrors(err, setError, ["new_password"]);
    }
  };

  return (
    <AuthLayout title="Choose a new password">
      <form className="authForm" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormError>
          {errorMessage(error)}
          {error?.data?.error?.code === "INVALID_RESET_TOKEN" && (
            <>
              {" "}
              <Link to="/forgot-password">Request a new link</Link>
            </>
          )}
        </FormError>
        <TextField
          id="reset-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          error={errors.new_password?.message}
          {...register("new_password")}
        />
        <TextField
          id="reset-confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />
        <SubmitButton loading={isLoading}>Save new password</SubmitButton>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
