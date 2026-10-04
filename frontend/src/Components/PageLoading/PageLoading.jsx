import React from "react";

// Placeholder while a lazily loaded page or the session check finishes;
// keeps the footer from jumping up.
const PageLoading = () => (
  <div className="pageLoading" role="status">
    <span className="visuallyHidden">Loading</span>
  </div>
);

export default PageLoading;
