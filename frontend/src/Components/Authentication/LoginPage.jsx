import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelector } from "react-redux";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import AuthLayout from "./AuthLayout";
import { FormError, SubmitButton, TextField } from "../Form/Form";
import { errorMessage } from "../../Api/errors";
import { useLoginMutation } from "../../Features/Auth/authApi";
import { selectIsAuthenticated } from "../../Features/Auth/authSlice";
import { safeNextPath } from "../../Features/Auth/guards";
import { loginSchema } from "../../Features/Auth/schemas";
import { notify } from "../../Utils/notify";
import useDocumentTitle from "../../Utils/useDocumentTitle";

const LoginPage = () => {
  useDocumentTitle("Log In");
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [login, { isLoading, error }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  if (isAuthenticated && !isLoading) return <Navigate to={next} replace />;

  const onSubmit = async (values) => {
    try {
      const session = await login(values).unwrap();
      notify.success(`Welcome back, ${session.user.full_name.split(" ")[0]}`);
      navigate(next, { replace: true });
    } catch {
      // Shown below via `error`.
    }
  };

  return (
    <AuthLayout title="Log in" tabs>
      <form className="authForm" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormError>{errorMessage(error)}</FormError>
        <TextField
          id="login-email"
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="authRow">
          <Link to="/forgot-password">Forgot your password?</Link>
        </div>
        <SubmitButton loading={isLoading} loadingText="Logging in…">
          Log in
        </SubmitButton>
      </form>
      <p className="authFooter">
        New here? <Link to={`/register?${params}`}>Create an account</Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;
