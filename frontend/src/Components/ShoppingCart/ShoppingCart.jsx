import React, { useEffect, useState } from "react";
import "./ShoppingCart.css";
import { Link, useNavigate } from "react-router-dom";
import { MdOutlineClose } from "react-icons/md";

import { useCart } from "../../Features/Cart/useCart";
import { errorMessage } from "../../Api/errors";
import { imageUrl } from "../../Utils/cloudinary";
import { formatPaise } from "../../Utils/format";

const productUrl = (line) => `/products/${line.product_slug}?variant=${encodeURIComponent(line.sku)}`;

// The +/- buttons change the quantity at once; a typed number is applied when
// the field loses focus or Enter is pressed.
const QuantityInput = ({ line, onChange, className }) => {
  const { product_name: name, quantity } = line;
  const [text, setText] = useState(String(quantity));
  const max = Math.max(line.max_quantity, quantity);

  useEffect(() => setText(String(quantity)), [quantity]);

  const commit = () => {
    const value = Math.min(max, parseInt(text, 10));
    if (value >= 1 && value !== quantity) onChange(value);
    else setText(String(quantity));
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= 1}
        aria-label={`Decrease quantity of ${name}`}
      >
        -
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={text}
        aria-label={`Quantity of ${name}`}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= line.max_quantity}
        aria-label={`Increase quantity of ${name}`}
      >
        +
      </button>
    </div>
  );
};

const RemoveButton = ({ line, onRemove, size }) => (
  <button
    type="button"
    className="cartRemoveBtn"
    onClick={() => onRemove(line.variant_id)}
    aria-label={`Remove ${line.product_name} (${line.color_name}) from cart`}
  >
    <MdOutlineClose size={size} />
  </button>
);

// What's wrong with a line, and the one-click fix where there is one.
const LineIssue = ({ line, onChange }) => {
  if (!line.issue) return null;
  if (line.issue === "INSUFFICIENT_STOCK") {
    return (
      <p className="cartLineIssue" role="status">
        Only {line.max_quantity} left.{" "}
        <button type="button" className="cartLineFix" onClick={() => onChange(line.max_quantity)}>
          Change to {line.max_quantity}
        </button>
      </p>
    );
  }
  return (
    <p className="cartLineIssue" role="status">
      {line.issue === "OUT_OF_STOCK" ? "Out of stock" : "No longer available"} — please remove it to
      continue.
    </p>
  );
};

const LineName = ({ line, onChange }) => (
  <>
    <Link to={productUrl(line)}>
      <h4>{line.product_name}</h4>
    </Link>
    <p>Colour: {line.color_name}</p>
    <LineIssue line={line} onChange={onChange} />
  </>
);

const LineImage = ({ line }) => (
  <Link to={productUrl(line)} tabIndex={-1} aria-hidden="true">
    <img src={imageUrl(line.image, 240) ?? undefined} alt="" width={120} height={120} />
  </Link>
);

const CartEmpty = () => (
  <div className="shoppingCartEmpty">
    <span>Your cart is empty!</span>
    <Link to="/shop" className="cartShopNow">
      Shop Now
    </Link>
  </div>
);

const CartLines = ({ lines, setQuantity, remove }) => (
  <>
    {/* Desktop and tablet */}
    <table className="shoppingBagTable">
      <thead>
        <tr>
          <th>Product</th>
          <th>
            <span className="visuallyHidden">Details</span>
          </th>
          <th>Price</th>
          <th>Quantity</th>
          <th>Subtotal</th>
          <th>
            <span className="visuallyHidden">Remove</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => {
          const onChange = (quantity) => setQuantity(line.variant_id, quantity);
          return (
            <tr key={line.variant_id} className={line.issue ? "cartLineHasIssue" : undefined}>
              <td>
                <div className="shoppingBagTableImg">
                  <LineImage line={line} />
                </div>
              </td>
              <td>
                <div className="shoppingBagTableProductDetail">
                  <LineName line={line} onChange={onChange} />
                </div>
              </td>
              <td>
                {formatPaise(line.unit_price_paise)}
                {line.mrp_paise > line.unit_price_paise && (
                  <s className="cartLineMrp">{formatPaise(line.mrp_paise)}</s>
                )}
              </td>
              <td>
                {line.issue === "INACTIVE" ? (
                  line.quantity
                ) : (
                  <QuantityInput line={line} onChange={onChange} className="ShoppingBagTableQuantity" />
                )}
              </td>
              <td>
                <p className="cartLineTotal">{formatPaise(line.line_total_paise)}</p>
              </td>
              <td>
                <RemoveButton line={line} onRemove={remove} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {/* Mobile */}
    <div className="shoppingBagTableMobile">
      {lines.map((line) => {
        const onChange = (quantity) => setQuantity(line.variant_id, quantity);
        return (
          <div
            className={`shoppingBagTableMobileItems ${line.issue ? "cartLineHasIssue" : ""}`}
            key={line.variant_id}
          >
            <div className="shoppingBagTableMobileItemsImg">
              <LineImage line={line} />
            </div>
            <div className="shoppingBagTableMobileItemsDetail">
              <div className="shoppingBagTableMobileItemsDetailMain">
                <LineName line={line} onChange={onChange} />
                {line.issue !== "INACTIVE" && (
                  <QuantityInput line={line} onChange={onChange} className="shoppingBagTableMobileQuantity" />
                )}
                <span>{formatPaise(line.unit_price_paise)}</span>
              </div>
              <div className="shoppingBagTableMobileItemsDetailTotal">
                <RemoveButton line={line} onRemove={remove} size={20} />
                <p>{formatPaise(line.line_total_paise)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </>
);

const ShoppingCart = () => {
  // Re-priced every time the page opens.
  const { cart, isLoading, error, refetch, setQuantity, remove } = useCart({ fresh: true });
  const navigate = useNavigate();
  const lines = cart?.lines ?? [];

  let content;
  if (isLoading) {
    content = (
      <p className="cartStatus" role="status">
        Loading your cart…
      </p>
    );
  } else if (error) {
    content = (
      <div className="cartStatus" role="alert">
        <p>{errorMessage(error, "We couldn’t load your cart.")}</p>
        <button type="button" className="cartShopNow" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  } else if (lines.length === 0) {
    content = <CartEmpty />;
  } else {
    content = <CartLines lines={lines} setQuantity={setQuantity} remove={remove} />;
  }

  return (
    <div className="shoppingCartSection">
      <h2>Cart</h2>

      <div className="shoppingBagSection">
        <div className="shoppingBagTableSection">{content}</div>

        <div className="shoppingBagTotal">
          <h3>Cart Totals</h3>
          <table className="shoppingBagTotalTable">
            <tbody>
              <tr>
                <th>Subtotal</th>
                <td>{formatPaise(cart?.subtotal_paise ?? 0)}</td>
              </tr>
              {cart?.savings_paise > 0 && (
                <tr>
                  <th>You save</th>
                  <td className="cartSavings">{formatPaise(cart.savings_paise)}</td>
                </tr>
              )}
              <tr>
                <th>Shipping</th>
                <td>Calculated at checkout</td>
              </tr>
              <tr>
                <th>Total</th>
                <td>
                  {formatPaise(cart?.subtotal_paise ?? 0)}
                  <p className="cartTaxNote">Prices include GST</p>
                </td>
              </tr>
            </tbody>
          </table>
          {cart?.has_issues && (
            <p className="cartLineIssue" role="status">
              Some items need your attention before checkout.
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate("/checkout")}
            disabled={lines.length === 0 || cart.has_issues}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
