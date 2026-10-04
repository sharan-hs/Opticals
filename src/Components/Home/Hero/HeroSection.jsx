import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import "./HeroSection.css";
import ErrorBoundary from "../../ErrorBoundary/ErrorBoundary";

const Hero3D = lazy(() => import("./Hero3D"));

const FRAME_COLORS = [
  { label: "Black", value: "#353933" },
  { label: "Green", value: "#2e7d32" },
  { label: "Violet", value: "#726DE7" },
  { label: "Red", value: "#c62828" },
];

const matches = (query) =>
  typeof window !== "undefined" && window.matchMedia?.(query).matches;

const ModelLoading = () => (
  <div className="heroModelLoading" role="status">
    <span className="heroSpinner" aria-hidden="true" />
    <span className="visuallyHidden">Loading 3D view</span>
  </div>
);

const HeroSection = () => {
  const [frameColor, setFrameColor] = useState(FRAME_COLORS[0].value);
  const [inView, setInView] = useState(true);
  const modelRef = useRef(null);

  // Stop rendering the 3D scene while it is scrolled out of view.
  useEffect(() => {
    const element = modelRef.current;
    if (!element || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const interactive = matches("(hover: hover) and (pointer: fine)");
  const autoRotate = !matches("(prefers-reduced-motion: reduce)");

  return (
    <section className="heroMain">
      <div className="sectionleft">
        <p>Since 1988</p>
        <h1>Find Your Perfect Frames</h1>
        <span>
          Sunglasses and eyewear from trusted brands, chosen by Bengaluru’s
          opticians.
        </span>
        <div className="heroLink">
          <Link to="/shop">
            <h5>Discover More</h5>
          </Link>
        </div>
      </div>
      <div className="sectionright">
        <div className="heroModel" ref={modelRef}>
          <ErrorBoundary fallback={null}>
            <Suspense fallback={<ModelLoading />}>
              <Hero3D
                color={frameColor}
                active={inView}
                interactive={interactive}
                autoRotate={autoRotate}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
        <div className="heroColorBtn" role="group" aria-label="Frame colour">
          {FRAME_COLORS.map((color) => (
            <button
              type="button"
              key={color.value}
              onClick={() => setFrameColor(color.value)}
              style={{ backgroundColor: color.value }}
              aria-label={color.label}
              aria-pressed={frameColor === color.value}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
