import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AdminLayout from "./AdminLayout";
import BrandsPage from "./BrandsPage";
import CategoriesPage from "./CategoriesPage";
import InventoryPage from "./InventoryPage";
import OrderDetailPage from "./OrderDetailPage";
import OrdersPage from "./OrdersPage";
import ProductEditor from "./ProductEditor";
import ProductsPage from "./ProductsPage";
import SettingsPage from "./SettingsPage";
import TransactionsPage from "./TransactionsPage";

// Loaded lazily, only for admins. The backend enforces access on every call.
const AdminApp = () => (
  <Routes>
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<Navigate to="orders" replace />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route path="orders/:orderNumber" element={<OrderDetailPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="products" element={<ProductsPage />} />
      <Route path="products/:id" element={<ProductEditor />} />
      <Route path="inventory" element={<InventoryPage />} />
      <Route path="inventory/history" element={<TransactionsPage />} />
      <Route path="categories" element={<CategoriesPage />} />
      <Route path="brands" element={<BrandsPage />} />
      <Route path="*" element={<Navigate to="products" replace />} />
    </Route>
  </Routes>
);

export default AdminApp;
