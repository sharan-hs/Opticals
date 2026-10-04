import React from "react";

// Renders `fallback` instead of crashing the page when a child throws
// (e.g. WebGL unavailable for the 3D hero).
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    return this.state.hasError ? this.props.fallback ?? null : this.props.children;
  }
}

export default ErrorBoundary;
