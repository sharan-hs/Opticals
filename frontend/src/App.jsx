import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import "./App.css";

import Home from "./Pages/Home";
import Header from "./Components/Header/Navbar";
import Footer from "./Components/Footer/Footer";
import ScrollToTop from "./Components/ScrollButton/ScrollToTop";
import ScrollToTopOnNavigate from "./Components/ScrollButton/ScrollToTopOnNavigate";
import PageLoading from "./Components/PageLoading/PageLoading";
import { RequireAuth, RequireRole, useSessionRestore } from "./Features/Auth/guards";
import { useCartSync } from "./Features/Cart/useCart";

// Every page except the landing page is downloaded on first visit.
const About = lazy(() => import("./Pages/About"));
const Shop = lazy(() => import("./Pages/Shop"));
const Contact = lazy(() => import("./Pages/Contact"));
const ProductDetails = lazy(() => import("./Pages/ProductDetails"));
const NotFound = lazy(() => import("./Pages/NotFound"));
const LoginPage = lazy(() => import("./Components/Authentication/LoginPage"));
const RegisterPage = lazy(() => import("./Components/Authentication/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./Components/Authentication/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./Components/Authentication/ResetPasswordPage"));
const AccountLayout = lazy(() => import("./Components/Account/AccountLayout"));
const ProfilePage = lazy(() => import("./Components/Account/ProfilePage"));
const AddressesPage = lazy(() => import("./Components/Account/AddressesPage"));
const SecurityPage = lazy(() => import("./Components/Account/SecurityPage"));
const OrdersPage = lazy(() => import("./Components/Account/OrdersPage"));
const CheckoutPage = lazy(() => import("./Components/Checkout/CheckoutPage"));
const OrderPage = lazy(() => import("./Components/Orders/OrderPage"));
// Separate bundle; downloaded only when an admin opens /admin.
const AdminApp = lazy(() => import("./Admin/AdminApp"));
const LegalPage = lazy(() => import("./Components/Terms/LegalPage"));
const ShoppingCart = lazy(() => import("./Components/ShoppingCart/ShoppingCart"));

// Storefront pages share the header and footer; /admin has its own layout.
const Shell = () => {
  useSessionRestore();
  useCartSync();
  const { pathname } = useLocation();

  if (pathname.startsWith("/admin")) {
    return (
      <Suspense fallback={<PageLoading />}>
        <RequireRole roles={["ADMIN"]}>
          <AdminApp />
        </RequireRole>
        <Toaster />
      </Suspense>
    );
  }

  return (
    <>
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountLayout />
                </RequireAuth>
              }
            >
              <Route index element={<ProfilePage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="security" element={<SecurityPage />} />
              <Route path="orders" element={<OrdersPage />} />
            </Route>
            <Route
              path="/checkout"
              element={
                <RequireAuth>
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route
              path="/orders/:orderNumber"
              element={
                <RequireAuth>
                  <OrderPage />
                </RequireAuth>
              }
            />
            {/* Old links */}
            <Route path="/loginSignUp" element={<Navigate to="/login" replace />} />
            <Route path="/resetPassword" element={<Navigate to="/forgot-password" replace />} />
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
    </>
  );
};

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Shell />
  </BrowserRouter>
);

export default App;
