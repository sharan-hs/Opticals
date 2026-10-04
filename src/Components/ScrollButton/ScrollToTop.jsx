import React, { useEffect, useState } from "react";

import "./ScrollToTop.css";

import { GoChevronUp } from "react-icons/go";

const ScrollToTop = () => {
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="top-to-btm">
      {showTopBtn && (
        <button
          type="button"
          className="iconStyle"
          onClick={goToTop}
          aria-label="Back to top"
        >
          <GoChevronUp color="black" size={23} />
        </button>
      )}
    </div>
  );
};

export default ScrollToTop;
