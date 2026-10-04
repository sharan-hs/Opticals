import React from "react";
import "./Footer.css";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";

import logo from "../../Assets/logo.webp";
import { storeInfo } from "../../Config/storeInfo";

const SOCIAL_LINKS = [
  { key: "instagram", label: "Instagram", Icon: FaInstagram },
  { key: "facebook", label: "Facebook", Icon: FaFacebookF },
  { key: "youtube", label: "YouTube", Icon: FaYoutube },
].filter(({ key }) => storeInfo.social[key]);

const FOOTER_COLUMNS = [
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/contact", label: "Contact Us" },
    ],
  },
  {
    heading: "Shop",
    links: [
      { to: "/shop", label: "Shop All" },
      { to: "/shop?category=Sunglasses", label: "Sunglasses" },
      { to: "/cart", label: "Cart" },
    ],
  },
  {
    heading: "Help",
    links: [
      { to: "/loginSignUp", label: "My Account" },
      { to: "/contact", label: "Store Locations" },
      { to: "/terms", label: "Terms & Conditions" },
      { to: "/privacy-policy", label: "Privacy Policy" },
      { to: "/refund-policy", label: "Refunds & Cancellation" },
      { to: "/shipping-policy", label: "Shipping & Delivery" },
    ],
  },
];

const Footer = () => (
  <footer className="footer">
    <div className="footer__container">
      <div className="footer_left">
        <div className="footer_logo_container">
          <img src={logo} alt={storeInfo.name} width={128} height={106} />
        </div>

        <address className="footer_address">
          {storeInfo.stores.map((store) => (
            <p key={store.name}>
              <strong>{store.name}</strong>
              <br />
              <a href={store.phoneHref}>{store.phone}</a>
            </p>
          ))}
          <p>
            <a href={`mailto:${storeInfo.email}`}>{storeInfo.email}</a>
          </p>
        </address>

        {SOCIAL_LINKS.length > 0 && (
          <div className="social_links">
            {SOCIAL_LINKS.map(({ key, label, Icon }) => (
              <a
                key={key}
                href={storeInfo.social[key]}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
              >
                <Icon />
              </a>
            ))}
          </div>
        )}
      </div>

      {FOOTER_COLUMNS.map((column) => (
        <div className="footer_content" key={column.heading}>
          <h5>{column.heading}</h5>
          <div className="links_container">
            <ul>
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>

    <div className="footer_bottom">
      <p>
        © {new Date().getFullYear()} {storeInfo.name}. All Rights Reserved
      </p>
      <p className="footer_credits">
        3D model: “
        <a
          href="https://sketchfab.com/3d-models/eyewear-specs-bb1a41bb9d4d412c985ba1492985e90f"
          target="_blank"
          rel="noreferrer"
        >
          Eyewear (Specs)
        </a>
        ” by{" "}
        <a href="https://sketchfab.com/rojencha" target="_blank" rel="noreferrer">
          rojencha
        </a>
        , licensed under{" "}
        <a
          href="http://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 4.0
        </a>
      </p>
    </div>
  </footer>
);

export default Footer;
