import React, { useState } from "react";
import "./LoginSignUp.css";
import { Link } from "react-router-dom";

import useDocumentTitle from "../../../Utils/useDocumentTitle";

// Accounts arrive with the backend (docs/TASKS.md Phase 4). Until then the
// forms validate in the browser and explain that sign-in isn't available yet.
const ComingSoonNotice = () => (
  <p className="authNotice" role="status">
    Customer accounts are coming soon. You can still shop and keep items in
    your cart.
  </p>
);

const LoginSignUp = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [submitted, setSubmitted] = useState(false);
  useDocumentTitle(activeTab === "login" ? "Log In" : "Register");

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSubmitted(false);
  };

  return (
    <div className="loginSignUpSection">
      <div className="loginSignUpContainer">
        <div className="loginSignUpTabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "login"}
            className={activeTab === "login" ? "active" : ""}
            onClick={() => switchTab("login")}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "register"}
            className={activeTab === "register" ? "active" : ""}
            onClick={() => switchTab("register")}
          >
            Register
          </button>
        </div>
        <div className="loginSignUpTabsContent">
          {activeTab === "login" && (
            <div className="loginSignUpTabsContentLogin" role="tabpanel">
              <form onSubmit={handleSubmit}>
                <label htmlFor="login-email" className="visuallyHidden">
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="Email address *"
                  autoComplete="email"
                  required
                />
                <label htmlFor="login-password" className="visuallyHidden">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Password *"
                  autoComplete="current-password"
                  required
                />
                <div className="loginSignUpForgetPass">
                  <label>
                    <input type="checkbox" className="brandRadio" />
                    <p>Remember me</p>
                  </label>
                  <p>
                    <Link to="/resetPassword">Lost password?</Link>
                  </p>
                </div>
                <button type="submit">Log In</button>
                {submitted && <ComingSoonNotice />}
              </form>
              <div className="loginSignUpTabsContentLoginText">
                <p>
                  No account yet?{" "}
                  <button
                    type="button"
                    className="linkButton"
                    onClick={() => switchTab("register")}
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </div>
          )}

          {activeTab === "register" && (
            <div className="loginSignUpTabsContentRegister" role="tabpanel">
              <form onSubmit={handleSubmit}>
                <label htmlFor="register-name" className="visuallyHidden">
                  Full name
                </label>
                <input
                  id="register-name"
                  type="text"
                  placeholder="Full name *"
                  autoComplete="name"
                  required
                />
                <label htmlFor="register-email" className="visuallyHidden">
                  Email address
                </label>
                <input
                  id="register-email"
                  type="email"
                  placeholder="Email address *"
                  autoComplete="email"
                  required
                />
                <label htmlFor="register-password" className="visuallyHidden">
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  placeholder="Password * (at least 8 characters)"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p>
                  Your personal data will be used to support your experience
                  throughout this website, to manage access to your account,
                  and for other purposes described in our{" "}
                  <Link
                    to="/privacy-policy"
                    style={{ textDecoration: "none", color: "#c32929" }}
                  >
                    privacy policy
                  </Link>
                  .
                </p>
                <button type="submit">Register</button>
                {submitted && <ComingSoonNotice />}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginSignUp;
