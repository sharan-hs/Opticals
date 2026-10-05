import React, { useState } from "react";
import { Link } from "react-router-dom";
import Tooltip from "@mui/material/Tooltip";
import Zoom from "@mui/material/Zoom";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";

import { AVAILABILITY_LABELS } from "../../../Features/Catalog/colors";
import { MAX_QUANTITY } from "../../../Features/Cart/cartSlice";
import { useCart } from "../../../Features/Cart/useCart";
import { cloudinarySrcSet, imageUrl } from "../../../Utils/cloudinary";
import { formatPaise } from "../../../Utils/format";

import "./Product.css";

// `product` is ProductDetail from the API; `variant` the selected colour.
const Product = ({ product, variant, onSelectVariant }) => {
  const { add } = useCart();
  const [adding, setAdding] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const images = [...variant.images, ...product.images];
  const image = images[currentImg];
  const fullName = `${product.brand.name} ${product.name}`;
  const soldOut = variant.availability === "out";

  const showImage = (index) => setCurrentImg((index + images.length) % images.length);
  const setClampedQuantity = (value) => setQuantity(Math.min(MAX_QUANTITY, Math.max(1, value)));

  return (
    <div className="productSection">
      <div className="productShowCase">
        <div className="productGallery">
          <div className="productThumb">
            {images.map((thumb, index) => (
              <button
                type="button"
                key={thumb.id}
                onClick={() => setCurrentImg(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === currentImg}
              >
                <img src={imageUrl(thumb, 160)} alt="" width={80} height={80} />
              </button>
            ))}
          </div>

          <div className="productFullImg">
            {image ? (
              <img
                src={imageUrl(image, 1000)}
                srcSet={cloudinarySrcSet(image.public_id, [500, 1000], { version: image.version })}
                sizes="(max-width: 991px) 100vw, 520px"
                alt={image.alt_text || `${fullName} in ${variant.color_name}, view ${currentImg + 1}`}
                width={520}
                height={520}
              />
            ) : (
              <div className="imagePlaceholder" style={{ aspectRatio: "1" }} />
            )}

            {images.length > 1 && (
              <div className="buttonsGroup">
                <button
                  type="button"
                  onClick={() => showImage(currentImg - 1)}
                  className="directionBtn"
                  aria-label="Previous image"
                >
                  <GoChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => showImage(currentImg + 1)}
                  className="directionBtn"
                  aria-label="Next image"
                >
                  <GoChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="productDetails">
          <nav className="productBreadcrumb" aria-label="Breadcrumb">
            <div className="breadcrumbLink">
              <Link to="/">Home</Link>&nbsp;/&nbsp;
              <Link to="/shop">The Shop</Link>&nbsp;/&nbsp;
              <Link to={`/shop?category=${encodeURIComponent(product.category.slug)}`}>
                {product.category.name}
              </Link>
              &nbsp;/&nbsp;
              <span aria-current="page">{product.name}</span>
            </div>
          </nav>

          <div className="productName">
            <p className="productBrand">{product.brand.name}</p>
            <h1>{product.name}</h1>
          </div>

          <div className="productPrice">
            <h3>
              {formatPaise(variant.price_paise)}
              {variant.discount_pct > 0 && (
                <>
                  {" "}
                  <s className="productMrp">MRP {formatPaise(variant.mrp_paise)}</s>{" "}
                  <span className="productDiscount">{variant.discount_pct}% off</span>
                </>
              )}
            </h3>
            <p>Inclusive of all taxes</p>
          </div>

          <p className={`productAvailability ${variant.availability}`} role="status">
            {AVAILABILITY_LABELS[variant.availability]}
          </p>

          {product.variants.length > 1 && (
            <div className="productSizeColor">
              <div className="productColor">
                <p>
                  Colour: <span>{variant.color_name}</span>
                </p>
                <div className="colorBtn" role="group" aria-label="Choose a colour">
                  {product.variants.map((option) => (
                    <Tooltip key={option.id} title={option.color_name} TransitionComponent={Zoom}>
                      <button
                        type="button"
                        onClick={() => onSelectVariant(option.sku)}
                        className={`${option.id === variant.id ? "highlighted" : ""} ${
                          option.availability === "out" ? "soldOut" : ""
                        }`}
                        style={{ backgroundColor: option.color_hex ?? "#ccc" }}
                        aria-label={`${option.color_name}${
                          option.availability === "out" ? " (out of stock)" : ""
                        }`}
                        aria-pressed={option.id === variant.id}
                      />
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="productCartQuantity">
            <div className="productQuantity">
              <button
                type="button"
                onClick={() => setClampedQuantity(quantity - 1)}
                disabled={quantity <= 1 || soldOut}
                aria-label="Decrease quantity"
              >
                -
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_QUANTITY}
                value={quantity}
                disabled={soldOut}
                aria-label="Quantity"
                onChange={(event) => {
                  const value = parseInt(event.target.value, 10);
                  if (!Number.isNaN(value)) setClampedQuantity(value);
                }}
              />
              <button
                type="button"
                onClick={() => setClampedQuantity(quantity + 1)}
                disabled={quantity >= MAX_QUANTITY || soldOut}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <div className="productCartBtn">
              <button
                type="button"
                disabled={soldOut || adding}
                onClick={async () => {
                  setAdding(true);
                  await add(variant.id, quantity);
                  setAdding(false);
                }}
              >
                {soldOut ? "Out of stock" : "Add to Cart"}
              </button>
            </div>
          </div>

          <div className="productTags">
            <p>
              <span>SKU: </span>
              {variant.sku}
            </p>
            <p>
              <span>CATEGORY: </span>
              {product.category.name}
            </p>
            <p>
              <span>BRAND: </span>
              {product.brand.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;
