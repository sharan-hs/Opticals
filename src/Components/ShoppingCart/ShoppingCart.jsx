import React, { useEffect, useState } from "react";
import "./ShoppingCart.css";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { MdOutlineClose } from "react-icons/md";

import {
  MAX_QUANTITY,
  removeFromCart,
  selectCartLines,
  selectCartSubtotal,
  updateQuantity,
} from "../../Features/Cart/cartSlice";
import { productImageUrl } from "../../Utils/cloudinary";
import { formatINR } from "../../Utils/format";
import { storeInfo } from "../../Config/storeInfo";

// Lets the field be cleared while typing; the cart is only updated with a
// valid number, and an empty field snaps back on blur.
const QuantityInput = ({ line, className }) => {
  const dispatch = useDispatch();
  const { product, quantity } = line;
  const [text, setText] = useState(String(quantity));

  useEffect(() => setText(String(quantity)), [quantity]);

  const setQuantity = (value) =>
    dispatch(updateQuantity({ id: product.id, quantity: value }));

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setQuantity(quantity - 1)}
        disabled={quantity <= 1}
        aria-label={`Decrease quantity of ${product.name}`}
      >
        -
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QUANTITY}
        value={text}
        aria-label={`Quantity of ${product.name}`}
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
        aria-label={`Increase quantity of ${product.name}`}
      >
        +
      </button>
    </div>
  );
};

const RemoveButton = ({ product, size }) => {
  const dispatch = useDispatch();
  return (
    <button
      type="button"
      className="cartRemoveBtn"
      onClick={() => dispatch(removeFromCart(product.id))}
      aria-label={`Remove ${product.name} from cart`}
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
  const subtotal = useSelector(selectCartSubtotal);
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
                    const { product } = line;
                    const productUrl = `/products/${product.slug}`;
                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="shoppingBagTableImg">
                            <Link to={productUrl} tabIndex={-1} aria-hidden="true">
                              <img
                                src={productImageUrl(product, 0, 240)}
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
                              <h4>
                                {product.brand} {product.name}
                              </h4>
                            </Link>
                            <p>Colour: {product.color}</p>
                          </div>
                        </td>
                        <td>{formatINR(product.price)}</td>
                        <td>
                          <QuantityInput
                            line={line}
                            className="ShoppingBagTableQuantity"
                          />
                        </td>
                        <td>
                          <p className="cartLineTotal">
                            {formatINR(line.lineTotal)}
                          </p>
                        </td>
                        <td>
                          <RemoveButton product={product} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile */}
              <div className="shoppingBagTableMobile">
                {lines.map((line) => {
                  const { product } = line;
                  const productUrl = `/products/${product.slug}`;
                  return (
                    <div className="shoppingBagTableMobileItems" key={product.id}>
                      <div className="shoppingBagTableMobileItemsImg">
                        <Link to={productUrl} tabIndex={-1} aria-hidden="true">
                          <img
                            src={productImageUrl(product, 0, 240)}
                            alt=""
                            width={120}
                            height={120}
                          />
                        </Link>
                      </div>
                      <div className="shoppingBagTableMobileItemsDetail">
                        <div className="shoppingBagTableMobileItemsDetailMain">
                          <Link to={productUrl}>
                            <h4>
                              {product.brand} {product.name}
                            </h4>
                          </Link>
                          <p>Colour: {product.color}</p>
                          <QuantityInput
                            line={line}
                            className="shoppingBagTableMobileQuantity"
                          />
                          <span>{formatINR(product.price)}</span>
                        </div>
                        <div className="shoppingBagTableMobileItemsDetailTotal">
                          <RemoveButton product={product} size={20} />
                          <p>{formatINR(line.lineTotal)}</p>
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
                <td>{formatINR(subtotal)}</td>
              </tr>
              <tr>
                <th>Shipping</th>
                <td>Calculated at checkout</td>
              </tr>
              <tr>
                <th>Total</th>
                <td>
                  {formatINR(subtotal)}
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
