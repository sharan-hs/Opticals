import React, { useState } from "react";
import { Link } from "react-router-dom";

import "../Orders/Orders.css";
import { errorMessage } from "../../Api/errors";
import { customerStatus, useListOrdersQuery } from "../../Features/Orders/ordersApi";
import { imageUrl } from "../../Utils/cloudinary";
import { formatDateTime, formatPaise } from "../../Utils/format";

const PAGE_SIZE = 10;

const OrdersPage = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useListOrdersQuery(
    { page, page_size: PAGE_SIZE },
    { refetchOnMountOrArgChange: true }
  );

  if (isLoading) return <p role="status">Loading your orders…</p>;
  if (error) return <p role="alert">{errorMessage(error)}</p>;

  return (
    <div className="accountPanel">
      <div className="accountPanelHeader">
        <h3>Orders</h3>
      </div>
      {data.items.length === 0 ? (
        <p>
          You haven’t ordered anything yet. <Link to="/shop">Browse the shop</Link>
        </p>
      ) : (
        <ul className="orderList">
          {data.items.map((order) => (
            <li key={order.order_number}>
              <Link to={`/orders/${order.order_number}`} className="orderListItem">
                <img
                  src={imageUrl(order.first_item_image && { public_id: order.first_item_image }, 160) ?? undefined}
                  alt=""
                  width={64}
                  height={64}
                />
                <span>
                  <strong>{order.order_number}</strong>
                  <span className="checkoutOptionHint">
                    {formatDateTime(order.placed_at)} · {order.first_item_name}
                    {order.item_count > 1 && ` and ${order.item_count - 1} more`} · {formatPaise(order.total_paise)}
                  </span>
                </span>
                <span className={`orderStatus ${order.status.toLowerCase()}`}>{customerStatus(order)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data.total_pages > 1 && (
        <div className="formActions">
          <button type="button" className="secondaryButton" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Newer
          </button>
          <button
            type="button"
            className="secondaryButton"
            disabled={page >= data.total_pages}
            onClick={() => setPage(page + 1)}
          >
            Older
          </button>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
