import React, { useEffect, useState } from "react";
import "./ShoppingCart.css";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { MdOutlineClose } from "react-icons/md";

import {
  MAX_QUANTITY,
  removeFromCart,
  selectCartLines,
  selectCartSubtotalPaise,
  updateQuantity,
} from "../../Features/Cart/cartSlice";
import { imageUrl } from "../../Utils/cloudinary";
import { formatPaise } from "../../Utils/format";
import { storeInfo } from "../../Config/storeInfo";

// Lets the field be cleared while typing; the cart is only updated with a
// valid number, and an empty field snaps back on blur.
const QuantityInput = ({ line, className }) => {
  const dispatch = useDispatch();
  const { sku, name, quantity } = line;
  const [text, setText] = useState(String(quantity));

  useEffect(() => setText(String(quantity)), [quantity]);

  const setQuantity = (value) =>
    dispatch(updateQuantity({ sku, quantity: value }));

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setQuantity(quantity - 1)}
        disabled={quantity <= 1}
        aria-label={`Decrease quantity of ${name}`}
      >
        -
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QUANTITY}
        value={text}
        aria-label={`Quantity of ${name}`}
        onChange={(event) => {
          setText(event.target.value);
          const value = parseInt(event.target.value, 10);
          if (!Number.isNaN(value)) setQuantity(value);
        }}
        onBlur={() => setText(String(quantity))}
      />
      <button
        type="button"
        onClick={() => setQuantity(quantity + 1)}
        disabled={quantity >= MAX_QUANTITY}
        aria-label={`Increase quantity of ${name}`}
      >
        +
      </button>
    </div>
  );
};

const RemoveButton = ({ line, size }) => {
  const dispatch = useDispatch();
  return (
    <button
      type="button"
      className="cartRemoveBtn"
      onClick={() => dispatch(removeFromCart(line.sku))}
      aria-label={`Remove ${line.name} (${line.colorName}) from cart`}
    >
      <MdOutlineClose size={size} />
    </button>
  );
};

const CartEmpty = () => (
  <div className="shoppingCartEmpty">
    <span>Your cart is empty!</span>
    <Link to="/shop" className="cartShopNow">
      Shop Now
    </Link>
  </div>
);

const CheckoutNotice = () => (
  <div className="checkoutNotice" role="status">
    <h4>Online checkout is launching soon</h4>
    <p>
      To order now, call your nearest store and we’ll keep your frames
      ready:
    </p>
    <ul>
      {storeInfo.stores.map((store) => (
        <li key={store.name}>
          {store.name}: <a href={store.phoneHref}>{store.phone}</a>
        </li>
      ))}
    </ul>
  </div>
);

const ShoppingCart = () => {
  const lines = useSelector(selectCartLines);
  const subtotal = useSelector(selectCartSubtotalPaise);
  const [showCheckoutNotice, setShowCheckoutNotice] = useState(false);

  return (
    <div className="shoppingCartSection">
      <h2>Cart</h2>

      <div className="shoppingBagSection">
        <div className="shoppingBagTableSection">
          {lines.length === 0 ? (
            <CartEmpty />
          ) : (
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
                    const productUrl = `/products/${line.slug}?variant=${encodeURIComponent(line.sku)}`;
                    return (
                      <tr key={line.sku}>
                        <td>
                          <div className="shoppingBagTableImg">
                            <Link to={productUrl} tabIndex={-1} aria-hidden="true">
                              <img
                                src={imageUrl(line.image, 240) ?? undefined}
                                alt=""
                                width={120}
                                height={120}
                              />
                            </Link>
                          </div>
                        </td>
                        <td>
                          <div className="shoppingBagTableProductDetail">
                            <Link to={productUrl}>
                              <h4>{line.name}</h4>
                            </Link>
                            <p>Colour: {line.colorName}</p>
                          </div>
                        </td>
                        <td>{formatPaise(line.pricePaise)}</td>
                        <td>
                          <QuantityInput
                            line={line}
                            className="ShoppingBagTableQuantity"
                          />
                        </td>
                        <td>
                          <p className="cartLineTotal">
                            {formatPaise(line.lineTotalPaise)}
                          </p>
                        </td>
                        <td>
                          <RemoveButton line={line} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile */}
              <div className="shoppingBagTableMobile">
                {lines.map((line) => {
                  const productUrl = `/products/${line.slug}?variant=${encodeURIComponent(line.sku)}`;
                  return (
                    <div className="shoppingBagTableMobileItems" key={line.sku}>
                      <div className="shoppingBagTableMobileItemsImg">
                        <Link to={productUrl} tabIndex={-1} aria-hidden="true">
                          <img
                            src={imageUrl(line.image, 240) ?? undefined}
                            alt=""
                            width={120}
                            height={120}
                          />
                        </Link>
                      </div>
                      <div className="shoppingBagTableMobileItemsDetail">
                        <div className="shoppingBagTableMobileItemsDetailMain">
                          <Link to={productUrl}>
                            <h4>{line.name}</h4>
                          </Link>
                          <p>Colour: {line.colorName}</p>
                          <QuantityInput
                            line={line}
                            className="shoppingBagTableMobileQuantity"
                          />
                          <span>{formatPaise(line.pricePaise)}</span>
                        </div>
                        <div className="shoppingBagTableMobileItemsDetailTotal">
                          <RemoveButton line={line} size={20} />
                          <p>{formatPaise(line.lineTotalPaise)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="shoppingBagTotal">
          <h3>Cart Totals</h3>
          <table className="shoppingBagTotalTable">
            <tbody>
              <tr>
                <th>Subtotal</th>
                <td>{formatPaise(subtotal)}</td>
              </tr>
              <tr>
                <th>Shipping</th>
                <td>Calculated at checkout</td>
              </tr>
              <tr>
                <th>Total</th>
                <td>
                  {formatPaise(subtotal)}
                  <p className="cartTaxNote">Prices include GST</p>
                </td>
              </tr>
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => setShowCheckoutNotice(true)}
            disabled={lines.length === 0}
          >
            Proceed to Checkout
          </button>
          {showCheckoutNotice && <CheckoutNotice />}
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
