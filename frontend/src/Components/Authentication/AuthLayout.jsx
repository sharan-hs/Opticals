import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Auth.css";

// Login and Register share the tabbed header; ?next= is carried across.
export const AuthTabs = () => {
  const { search } = useLocation();
  return (
    <nav className="authTabs" aria-label="Sign in or register">
      <NavLink to={`/login${search}`}>Login</NavLink>
      <NavLink to={`/register${search}`}>Register</NavLink>
    </nav>
  );
};

const AuthLayout = ({ title, tabs = false, children }) => (
  <section className="authSection">
    <div className="authContainer">
      {tabs ? <AuthTabs /> : <h2 className="authTitle">{title}</h2>}
      {tabs && <h2 className="visuallyHidden">{title}</h2>}
      {children}
    </div>
  </section>
);

export default AuthLayout;
