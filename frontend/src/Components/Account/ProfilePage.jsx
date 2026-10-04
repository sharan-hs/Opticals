import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelector } from "react-redux";

import { FormError, SubmitButton, TextField } from "../Form/Form";
import { applyFieldErrors, errorMessage } from "../../Api/errors";
import { useUpdateProfileMutation } from "../../Features/Account/accountApi";
import { selectCurrentUser } from "../../Features/Auth/authSlice";
import { profileSchema } from "../../Features/Auth/schemas";
import { notify } from "../../Utils/notify";
import useDocumentTitle from "../../Utils/useDocumentTitle";

// "+919731307237" -> "97313 07237" for editing; other numbers unchanged.
const displayPhone = (phone) =>
  phone?.startsWith("+91") && phone.length === 13
    ? `${phone.slice(3, 8)} ${phone.slice(8)}`
    : (phone ?? "");

const ProfilePage = () => {
  useDocumentTitle("My Profile");
  const user = useSelector(selectCurrentUser);
  const [updateProfile, { isLoading, error, reset }] = useUpdateProfileMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
    reset: resetForm,
  } = useForm({
    resolver: zodResolver(profileSchema),
    values: { full_name: user?.full_name ?? "", phone: displayPhone(user?.phone) },
  });

  const onSubmit = async (values) => {
    try {
      const updated = await updateProfile(values).unwrap();
      resetForm({ full_name: updated.full_name, phone: displayPhone(updated.phone) });
      notify.success("Profile saved");
    } catch (err) {
      if (applyFieldErrors(err, setError, ["full_name", "phone"])) reset();
    }
  };

  return (
    <div className="accountPanel">
      <h3>Profile</h3>
      <form className="accountForm" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormError>{errorMessage(error)}</FormError>
        <TextField id="profile-email" label="Email address" value={user?.email ?? ""} disabled />
        <TextField
          id="profile-name"
          label="Full name"
          autoComplete="name"
          error={errors.full_name?.message}
          {...register("full_name")}
        />
        <TextField
          id="profile-phone"
          label="Mobile number"
          type="tel"
          autoComplete="tel-national"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <SubmitButton loading={isLoading} disabled={!isDirty || isLoading}>
          Save changes
        </SubmitButton>
      </form>
    </div>
  );
};

export default ProfilePage;
