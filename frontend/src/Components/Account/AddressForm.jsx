import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormError, SelectField, SubmitButton, TextField } from "../Form/Form";
import { applyFieldErrors, errorMessage } from "../../Api/errors";
import { addressSchema } from "../../Features/Auth/schemas";
import { INDIAN_STATES } from "../../Data/indianStates";

const FIELDS = ["label", "full_name", "phone", "line1", "line2", "landmark", "city", "state", "pincode"];

const EMPTY = {
  label: "",
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
};

const toFormValues = (address) =>
  Object.fromEntries(FIELDS.map((field) => [field, address?.[field] ?? ""]));

// Empty optional fields go to the API as null.
const toPayload = (values) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === "" ? null : value])
  );

const AddressForm = ({ address, defaultName, onSave, onCancel, saving, error }) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: address ? toFormValues(address) : { ...EMPTY, full_name: defaultName ?? "" },
  });
  const idPrefix = address ? `address-${address.id}` : "address-new";
  const field = (name, label, props = {}) => (
    <TextField
      id={`${idPrefix}-${name}`}
      label={label}
      error={errors[name]?.message}
      {...props}
      {...register(name)}
    />
  );

  const submit = async (values) => {
    try {
      await onSave(toPayload(values));
    } catch (err) {
      applyFieldErrors(err, setError, FIELDS);
    }
  };

  return (
    <form className="accountForm addressForm" onSubmit={handleSubmit(submit)} noValidate>
      <FormError>{error && !error.data?.error?.details ? errorMessage(error) : null}</FormError>
      <div className="formGrid">
        {field("full_name", "Full name", { autoComplete: "name" })}
        {field("phone", "Mobile number", { type: "tel", autoComplete: "tel-national" })}
      </div>
      {field("line1", "Flat / house no. and street", { autoComplete: "address-line1" })}
      {field("line2", "Area / locality (optional)", { autoComplete: "address-line2" })}
      {field("landmark", "Landmark (optional)")}
      <div className="formGrid">
        {field("city", "City", { autoComplete: "address-level2" })}
        <SelectField
          id={`${idPrefix}-state`}
          label="State"
          placeholder="Choose a state"
          options={INDIAN_STATES}
          autoComplete="address-level1"
          error={errors.state?.message}
          {...register("state")}
        />
      </div>
      <div className="formGrid">
        {field("pincode", "Pincode", { inputMode: "numeric", autoComplete: "postal-code" })}
        {field("label", "Label (optional)", { placeholder: "Home, Work…" })}
      </div>
      <div className="formActions">
        <SubmitButton loading={saving}>Save address</SubmitButton>
        <button type="button" className="secondaryButton" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default AddressForm;
