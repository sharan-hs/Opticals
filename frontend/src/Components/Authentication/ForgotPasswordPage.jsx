import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";

import AuthLayout from "./AuthLayout";
import { FormError, SubmitButton, TextField } from "../Form/Form";
import { errorMessage } from "../../Api/errors";
import { useForgotPasswordMutation } from "../../Features/Auth/authApi";
import { forgotPasswordSchema } from "../../Features/Auth/schemas";
import useDocumentTitle from "../../Utils/useDocumentTitle";

const ForgotPasswordPage = () => {
  useDocumentTitle("Forgot Password");
  const [requestReset, { isLoading, isSuccess, error }] = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  return (
    <AuthLayout title="Reset your password">
      {isSuccess ? (
        <p className="formNotice" role="status">
          If there’s an account for <strong>{getValues("email")}</strong>, we’ve emailed a link
          to reset the password. It works for 30 minutes. Check your spam folder if it doesn’t
          arrive.
        </p>
      ) : (
        <form
          className="authForm"
          onSubmit={handleSubmit((values) => requestReset(values))}
          noValidate
        >
          <p className="authIntro">Enter your email and we’ll send you a link to reset it.</p>
          <FormError>{errorMessage(error)}</FormError>
          <TextField
            id="forgot-email"
            label="Email address"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <SubmitButton loading={isLoading}>Send reset link</SubmitButton>
        </form>
      )}
      <p className="authFooter">
        Remembered it? <Link to="/login">Back to login</Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
