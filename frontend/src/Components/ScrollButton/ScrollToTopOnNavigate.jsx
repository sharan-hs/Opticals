import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Starts every new page at the top. Query-string-only changes (shop filters,
// pagination) keep the scroll position; those pages manage it themselves.
const ScrollToTopOnNavigate = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTopOnNavigate;
