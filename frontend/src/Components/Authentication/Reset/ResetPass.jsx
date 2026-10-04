import React, { useState } from "react";

import "./ResetPass.css";
import { Link } from "react-router-dom";

import useDocumentTitle from "../../../Utils/useDocumentTitle";

const ResetPass = () => {
  useDocumentTitle("Reset Password");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="resetPasswordSection">
      <h2>Reset Your Password</h2>
      <div className="resetPasswordContainer">
        <p>We will send you an email to reset your password</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <label htmlFor="reset-email" className="visuallyHidden">
            Email address
          </label>
          <input
            id="reset-email"
            type="email"
            placeholder="Email address *"
            autoComplete="email"
            required
          />
          <button type="submit">Submit</button>
        </form>
        {submitted && (
          <p className="authNotice" role="status">
            Customer accounts are coming soon, so password reset isn’t
            available yet.
          </p>
        )}
      </div>
      <p>
        Back to{" "}
        <Link to="/loginSignUp">
          <span>Login</span>
        </Link>
      </p>
    </div>
  );
};

export default ResetPass;
