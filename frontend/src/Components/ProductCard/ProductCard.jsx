import React from "react";
import { Link } from "react-router-dom";
import { FaCartPlus } from "react-icons/fa";

import {
  cloudinarySrcSet,
  cloudinaryUrl,
  productImageIds,
} from "../../Utils/cloudinary";
import { formatINR } from "../../Utils/format";
import { useAddToCart } from "../../Features/Cart/useAddToCart";

import "./ProductCard.css";

const IMAGE_WIDTHS = [300, 600];
const IMAGE_SIZES = "(max-width: 991px) 50vw, 25vw";

const ProductImage = ({ product, index, className, alt }) => {
  const publicId = productImageIds(product)[index];
  const version = product.imageVersion;
  const srcSet = cloudinarySrcSet(publicId, IMAGE_WIDTHS, { version });
  return (
    <img
      className={className}
      srcSet={srcSet}
      sizes={IMAGE_SIZES}
      src={cloudinaryUrl(publicId, { width: 600, version })}
      alt={alt}
      width={600}
      height={750}
      loading="lazy"
      decoding="async"
    />
  );
};

const ProductCard = ({ product }) => {
  const addToCart = useAddToCart();
  const productUrl = `/products/${product.slug}`;

  return (
    <article className="productCard">
      <div className="productCardMedia">
        <Link to={productUrl} tabIndex={-1} aria-hidden="true">
          <ProductImage
            product={product}
            index={0}
            className="productCardImgFront"
            alt=""
          />
          {product.imageCount > 1 && (
            <ProductImage
              product={product}
              index={1}
              className="productCardImgBack"
              alt=""
            />
          )}
        </Link>
        <button
          type="button"
          className="productCardAdd"
          onClick={() => addToCart(product)}
          aria-label={`Add ${product.name} to cart`}
        >
          <FaCartPlus aria-hidden="true" />
          <span>Add to Cart</span>
        </button>
      </div>
      <div className="productCardInfo">
        <p className="productCardCategory">{product.category}</p>
        <h3 className="productCardName">
          <Link to={productUrl}>
            {product.brand} {product.name}
          </Link>
        </h3>
        <p className="productCardPrice">{formatINR(product.price)}</p>
      </div>
    </article>
  );
};

export default ProductCard;
