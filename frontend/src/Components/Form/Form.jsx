import React, { forwardRef } from "react";
import "./Form.css";

const describedBy = (id, hint, error) =>
  [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

// Label, input, hint and error wired together for screen readers.
// Works with react-hook-form: <TextField {...register("email")} />.
export const TextField = forwardRef(function TextField(
  { id, label, error, hint, type = "text", ...inputProps },
  ref
) {
  return (
    <div className="formField">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={ref}
        type={type}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...inputProps}
      />
      {hint && (
        <p id={`${id}-hint`} className="fieldHint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="fieldError">
          {error}
        </p>
      )}
    </div>
  );
});

export const SelectField = forwardRef(function SelectField(
  { id, label, error, options, placeholder, ...selectProps },
  ref
) {
  return (
    <div className="formField">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy(id, null, error)}
        {...selectProps}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="fieldError">
          {error}
        </p>
      )}
    </div>
  );
});

// Error for the whole form (wrong password, server unreachable...).
export const FormError = ({ children }) =>
  children ? (
    <p className="formError" role="alert">
      {children}
    </p>
  ) : null;

export const SubmitButton = ({ loading, children, loadingText = "Please wait…", ...props }) => (
  <button type="submit" className="formSubmit" disabled={loading} aria-busy={loading} {...props}>
    {loading ? loadingText : children}
  </button>
);
