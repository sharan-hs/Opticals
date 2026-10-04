import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelector } from "react-redux";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import AuthLayout from "./AuthLayout";
import { FormError, SubmitButton, TextField } from "../Form/Form";
import { applyFieldErrors, errorMessage } from "../../Api/errors";
import { useRegisterMutation } from "../../Features/Auth/authApi";
import { selectIsAuthenticated } from "../../Features/Auth/authSlice";
import { safeNextPath } from "../../Features/Auth/guards";
import { registerSchema } from "../../Features/Auth/schemas";
import { notify } from "../../Utils/notify";
import useDocumentTitle from "../../Utils/useDocumentTitle";

const FIELDS = ["full_name", "email", "phone", "password"];

const RegisterPage = () => {
  useDocumentTitle("Create Account");
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [registerAccount, { isLoading, error, reset }] = useRegisterMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", phone: "", password: "" },
  });

  if (isAuthenticated && !isLoading) return <Navigate to={next} replace />;

  const onSubmit = async (values) => {
    try {
      await registerAccount({ ...values, phone: values.phone || null }).unwrap();
      notify.success("Your account is ready");
      navigate(next, { replace: true });
    } catch (err) {
      if (applyFieldErrors(err, setError, FIELDS)) reset();
    }
  };

  return (
    <AuthLayout title="Create an account" tabs>
      <form className="authForm" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormError>{errorMessage(error)}</FormError>
        <TextField
          id="register-name"
          label="Full name"
          autoComplete="name"
          error={errors.full_name?.message}
          {...register("full_name")}
        />
        <TextField
          id="register-email"
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          id="register-phone"
          label="Mobile number (optional)"
          type="tel"
          autoComplete="tel-national"
          hint="For delivery updates"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <TextField
          id="register-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />
        <p className="authPrivacy">
          We use your details to manage your account and orders, as described in our{" "}
          <Link to="/privacy-policy">privacy policy</Link>.
        </p>
        <SubmitButton loading={isLoading} loadingText="Creating account…">
          Create account
        </SubmitButton>
      </form>
      <p className="authFooter">
        Already have an account? <Link to={`/login?${params}`}>Log in</Link>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;
