import React, { useEffect, useRef, useState } from "react";
import "./Navbar.css";

import { useSelector } from "react-redux";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import Badge from "@mui/material/Badge";
import { RiMenu2Line, RiShoppingBagLine } from "react-icons/ri";
import { FiSearch } from "react-icons/fi";
import { FaRegUser } from "react-icons/fa6";
import { MdOutlineClose } from "react-icons/md";

import logo2 from "../../Assets/logo2.png";
import { useCartCount } from "../../Features/Cart/useCart";
import { selectAuthStatus, selectCurrentUser } from "../../Features/Auth/authSlice";
import { useSignOut } from "../../Features/Auth/useSignOut";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const SearchForm = ({ id, className, onSearch, inputRef }) => {
  const [query, setQuery] = useState("");
  return (
    <form
      role="search"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
        setQuery("");
      }}
    >
      <label htmlFor={id} className="visuallyHidden">
        Search products
      </label>
      <input
        id={id}
        ref={inputRef}
        type="search"
        placeholder="Search products"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button type="submit" aria-label="Search">
        <FiSearch size={20} />
      </button>
    </form>
  );
};

const CartLink = ({ count, iconColor }) => (
  <Link to="/cart" aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}>
    <Badge
      badgeContent={count}
      showZero
      color="primary"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <RiShoppingBagLine size={22} color={iconColor} />
    </Badge>
  </Link>
);

// Signed out: a link to log in. Signed in: a small panel with account links.
const AccountMenu = () => {
  const user = useSelector(selectCurrentUser);
  const status = useSelector(selectAuthStatus);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [signOut] = useSignOut();
  const ref = useRef(null);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status !== "authenticated") {
    return (
      <Link to="/login" aria-label="Log in or create an account">
        <FaRegUser size={22} />
      </Link>
    );
  }

  return (
    <div className="accountMenu" ref={ref}>
      <button
        type="button"
        className="iconButton"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
      >
        <FaRegUser size={22} />
      </button>
      {open && (
        <div id="account-menu" className="accountMenuPanel">
          <p>Hi, {user.full_name.split(" ")[0]}</p>
          <Link to="/account">My account</Link>
          <Link to="/account/addresses">Addresses</Link>
          {user.role === "ADMIN" && <Link to="/admin">Shop admin</Link>}
          <button type="button" onClick={signOut}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const cartCount = useCartCount();
  const isAuthenticated = useSelector(selectAuthStatus) === "authenticated";
  const [signOut] = useSignOut();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const desktopSearchRef = useRef(null);

  // Close menus whenever the page changes, however the navigation happened.
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  // Lock page scroll only while the mobile menu is open.
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (searchOpen) desktopSearchRef.current?.focus();
  }, [searchOpen]);

  const search = (query) =>
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");

  return (
    <header className="siteHeader">
      {/* Desktop */}
      <nav className="navBar" aria-label="Main">
        <div className="logoLinkContainer">
          <div className="logoContainer">
            <Link to="/">
              <img width={143} height={50} src={logo2} alt="Vijai Opticians home" />
            </Link>
          </div>
          <div className="linkContainer">
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.to === "/"}>
                    {link.label.toUpperCase()}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="iconContainer">
          {searchOpen && (
            <SearchForm
              id="desktop-search"
              className="headerSearch"
              onSearch={search}
              inputRef={desktopSearchRef}
            />
          )}
          <button
            type="button"
            className="iconButton"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
          >
            {searchOpen ? <MdOutlineClose size={22} /> : <FiSearch size={22} />}
          </button>
          <AccountMenu />
          <CartLink count={cartCount} />
        </div>
      </nav>

      {/* Mobile */}
      <div className="mobileHeader">
        <div className="mobile-nav">
          <button
            type="button"
            className="iconButton"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <MdOutlineClose size={22} />
            ) : (
              <RiMenu2Line size={22} />
            )}
          </button>
          <div className="logoContainer">
            <Link to="/">
              <img width={172} height={60} src={logo2} alt="Vijai Opticians home" />
            </Link>
          </div>
          <CartLink count={cartCount} iconColor="black" />
        </div>

        <nav
          id="mobile-menu"
          className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}
          aria-label="Mobile"
        >
          <div className="mobile-menuTop">
            <div className="mobile-menuSearchBar">
              <SearchForm
                id="mobile-search"
                className="mobile-menuSearchBarContainer"
                onSearch={search}
              />
            </div>
            <div className="mobile-menuList">
              <ul>
                {NAV_LINKS.map((link) => (
                  <li key={link.to}>
                    <NavLink to={link.to} end={link.to === "/"}>
                      {link.label.toUpperCase()}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mobile-menuFooter">
            <div className="mobile-menuFooterLogin">
              <Link to={isAuthenticated ? "/account" : "/login"}>
                <FaRegUser aria-hidden="true" />
                <p>{isAuthenticated ? "My Account" : "Log in / Register"}</p>
              </Link>
              {isAuthenticated && (
                <button type="button" className="mobileSignOut" onClick={signOut}>
                  Log out
                </button>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
