import React from "react";
import { useSelector } from "react-redux";
import { NavLink, Outlet } from "react-router-dom";
import "./Account.css";

import { selectCurrentUser } from "../../Features/Auth/authSlice";
import { useSignOut } from "../../Features/Auth/useSignOut";

const LINKS = [
  { to: "/account", label: "Profile", end: true },
  { to: "/account/orders", label: "Orders" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/security", label: "Password & security" },
];

const AccountLayout = () => {
  const user = useSelector(selectCurrentUser);
  const [signOut, isLoading] = useSignOut();

  return (
    <section className="accountSection">
      <header className="accountHeader">
        <h2>My Account</h2>
        <p>
          Signed in as <strong>{user?.email}</strong>
        </p>
      </header>
      <div className="accountBody">
        <nav className="accountNav" aria-label="Account">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
          <button type="button" className="accountSignOut" onClick={signOut} disabled={isLoading}>
            Log out
          </button>
        </nav>
        <div className="accountContent">
          <Outlet />
        </div>
      </div>
    </section>
  );
};

export default AccountLayout;
