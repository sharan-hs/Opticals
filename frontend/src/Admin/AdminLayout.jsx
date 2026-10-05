import React from "react";
import { useSelector } from "react-redux";
import { Link, NavLink, Outlet } from "react-router-dom";
import "./Admin.css";

import { selectCurrentUser } from "../Features/Auth/authSlice";
import { useSignOut } from "../Features/Auth/useSignOut";
import { useLowStockQuery, useOrderCountsQuery } from "../Features/Admin/adminApi";

const AdminLayout = () => {
  const user = useSelector(selectCurrentUser);
  const [signOut] = useSignOut();
  const { data: low = [] } = useLowStockQuery();
  // Payments to check, orders to ship and refunds due; refreshed every minute.
  const { data: counts } = useOrderCountsQuery(undefined, { pollingInterval: 60000 });
  const todo = counts ? counts.to_verify + counts.to_ship + counts.refunds_pending : 0;

  return (
    <div className="adminShell">
      <aside className="adminSidebar">
        <Link to="/admin" className="adminBrand">
          Vijai Opticians
          <span>Admin</span>
        </Link>
        <nav aria-label="Admin">
          <NavLink to="/admin/orders">
            Orders
            {todo > 0 && (
              <span className="adminNavCount" aria-label={`${todo} orders need action`}>
                {todo}
              </span>
            )}
          </NavLink>
          <NavLink to="/admin/products">Products</NavLink>
          <NavLink to="/admin/inventory" end>
            Stock
            {low.length > 0 && (
              <span className="adminNavCount" aria-label={`${low.length} low on stock`}>
                {low.length}
              </span>
            )}
          </NavLink>
          <NavLink to="/admin/inventory/history">Stock history</NavLink>
          <NavLink to="/admin/categories">Categories</NavLink>
          <NavLink to="/admin/brands">Brands</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>
        </nav>
        <div className="adminSidebarFooter">
          <p>{user?.full_name}</p>
          <Link to="/">View shop</Link>
          <button type="button" onClick={signOut}>
            Log out
          </button>
        </div>
      </aside>
      <main className="adminMain">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
