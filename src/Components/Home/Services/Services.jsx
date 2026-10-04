import React from "react";
import "./Services.css";

import { FaStore } from "react-icons/fa";
import { TfiHeadphoneAlt } from "react-icons/tfi";
import { RiShieldCheckLine } from "react-icons/ri";

import { storeInfo } from "../../../Config/storeInfo";

// Only statements the business has confirmed (see docs/TASKS.md 0.4.10
// before adding delivery, support-hours or refund promises).
const SERVICES = [
  {
    Icon: RiShieldCheckLine,
    title: "Opticians Since 1988",
    text: "Decades of experience helping Bengaluru see clearly",
  },
  {
    Icon: FaStore,
    title: `${storeInfo.stores.length} Stores in Bengaluru`,
    text: storeInfo.stores.map((store) => store.name).join(" & "),
  },
  {
    Icon: TfiHeadphoneAlt,
    title: "Talk to an Optician",
    text: "Call either store for help choosing frames",
  },
];

const Services = () => (
  <section className="services" aria-label="Why shop with us">
    {SERVICES.map(({ Icon, title, text }) => (
      <div className="serviceBox" key={title}>
        <Icon size={50} style={{ marginBottom: "20px" }} aria-hidden="true" />
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    ))}
  </section>
);

export default Services;
