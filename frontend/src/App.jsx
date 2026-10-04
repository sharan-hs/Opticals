import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import "./App.css";

import Home from "./Pages/Home";
import Header from "./Components/Header/Navbar";
import Footer from "./Components/Footer/Footer";
import ScrollToTop from "./Components/ScrollButton/ScrollToTop";
import ScrollToTopOnNavigate from "./Components/ScrollButton/ScrollToTopOnNavigate";

// Every page except the landing page is downloaded on first visit.
const About = lazy(() => import("./Pages/About"));
const Shop = lazy(() => import("./Pages/Shop"));
const Contact = lazy(() => import("./Pages/Contact"));
const ProductDetails = lazy(() => import("./Pages/ProductDetails"));
const NotFound = lazy(() => import("./Pages/NotFound"));
const Authentication = lazy(() => import("./Pages/Authentication"));
const ResetPass = lazy(() => import("./Components/Authentication/Reset/ResetPass"));
const LegalPage = lazy(() => import("./Components/Terms/LegalPage"));
const ShoppingCart = lazy(() => import("./Components/ShoppingCart/ShoppingCart"));

const PageLoading = () => (
  <div className="pageLoading" role="status">
    <span className="visuallyHidden">Loading page</span>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <ScrollToTopOnNavigate />
      <ScrollToTop />
      <Header />
      <main>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/products/:slug" element={<ProductDetails />} />
            <Route path="/product" element={<Navigate to="/shop" replace />} />
            <Route path="/loginSignUp" element={<Authentication />} />
            <Route path="/resetPassword" element={<ResetPass />} />
            <Route path="/terms" element={<LegalPage page="terms" />} />
            <Route path="/privacy-policy" element={<LegalPage page="privacy" />} />
            <Route path="/refund-policy" element={<LegalPage page="refunds" />} />
            <Route path="/shipping-policy" element={<LegalPage page="shipping" />} />
            <Route path="/cart" element={<ShoppingCart />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <Toaster />
    </BrowserRouter>
  );
};

export default App;
