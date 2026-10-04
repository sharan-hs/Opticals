import React from "react";
import { Link } from "react-router-dom";
import { FaCartPlus } from "react-icons/fa";

import CloudImage from "../CloudImage/CloudImage";
import { formatPaise } from "../../Utils/format";
import { cartLineFor, useAddToCart } from "../../Features/Cart/useAddToCart";

import "./ProductCard.css";

const IMAGE_WIDTHS = [300, 600];
const IMAGE_SIZES = "(max-width: 991px) 50vw, 25vw";

// The quick "Add to Cart" works when there's only one colour; otherwise the
// shopper picks a colour on the product page.
const QuickAction = ({ product }) => {
  const addToCart = useAddToCart();
  const productUrl = `/products/${product.slug}`;

  if (product.availability === "out") {
    return (
      <span className="productCardAdd productCardAddDisabled" aria-hidden="true">
        <span>Out of stock</span>
      </span>
    );
  }
  if (product.colors.length > 1) {
    return (
      <Link to={productUrl} className="productCardAdd" aria-label={`Choose a colour of ${product.name}`}>
        <FaCartPlus aria-hidden="true" />
        <span>Choose colour</span>
      </Link>
    );
  }
  const [only] = product.colors;
  const line = cartLineFor(product, {
    sku: only.sku,
    color_name: only.name,
    price_paise: product.price_paise,
    image: product.image,
  });
  return (
    <button
      type="button"
      className="productCardAdd"
      onClick={() => addToCart(line)}
      aria-label={`Add ${product.brand.name} ${product.name} to cart`}
    >
      <FaCartPlus aria-hidden="true" />
      <span>Add to Cart</span>
    </button>
  );
};

// `product` is a ProductCard from the API.
const ProductCard = ({ product }) => {
  const productUrl = `/products/${product.slug}`;
  const colourCount = product.colors.length;

  return (
    <article className="productCard">
      <div className="productCardMedia">
        <Link to={productUrl} tabIndex={-1} aria-hidden="true">
          <CloudImage
            image={product.image}
            className="productCardImgFront"
            alt=""
            widths={IMAGE_WIDTHS}
            sizes={IMAGE_SIZES}
            width={600}
            height={750}
          />
        </Link>
        {product.availability !== "in_stock" && (
          <span className={`productCardBadge ${product.availability}`}>
            {product.availability === "out" ? "Out of stock" : "Only a few left"}
          </span>
        )}
        <QuickAction product={product} />
      </div>
      <div className="productCardInfo">
        <p className="productCardCategory">
          {product.category.name}
          {colourCount > 1 && <span className="productCardColours"> · {colourCount} colours</span>}
        </p>
        <h3 className="productCardName">
          <Link to={productUrl}>
            {product.brand.name} {product.name}
          </Link>
        </h3>
        <p className="productCardPrice">
          {colourCount > 1 && <span className="productCardFrom">From </span>}
          {formatPaise(product.price_paise)}
          {product.discount_pct > 0 && (
            <>
              {" "}
              <s className="productCardMrp">{formatPaise(product.mrp_paise)}</s>{" "}
              <span className="productCardDiscount">{product.discount_pct}% off</span>
            </>
          )}
        </p>
      </div>
    </article>
  );
};

export const ProductCardSkeleton = () => (
  <div className="productCard productCardSkeleton" aria-hidden="true">
    <div className="productCardMedia" />
    <div className="skeletonLine short" />
    <div className="skeletonLine" />
    <div className="skeletonLine short" />
  </div>
);

export default ProductCard;
