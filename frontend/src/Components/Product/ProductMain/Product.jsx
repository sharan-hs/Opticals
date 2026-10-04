import React, { useState } from "react";
import { Link } from "react-router-dom";
import Tooltip from "@mui/material/Tooltip";
import Zoom from "@mui/material/Zoom";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";

import { getColorSiblings } from "../../../Data/catalog";
import { MAX_QUANTITY } from "../../../Features/Cart/cartSlice";
import { useAddToCart } from "../../../Features/Cart/useAddToCart";
import {
  cloudinarySrcSet,
  cloudinaryUrl,
  productImageIds,
} from "../../../Utils/cloudinary";
import { formatINR } from "../../../Utils/format";

import "./Product.css";

const Product = ({ product }) => {
  const addToCart = useAddToCart();
  const [currentImg, setCurrentImg] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const imageIds = productImageIds(product);
  const version = product.imageVersion;
  const colorSiblings = getColorSiblings(product);
  const fullName = `${product.brand} ${product.name}`;

  const showImage = (index) =>
    setCurrentImg((index + imageIds.length) % imageIds.length);

  const setClampedQuantity = (value) =>
    setQuantity(Math.min(MAX_QUANTITY, Math.max(1, value)));

  return (
    <div className="productSection">
      <div className="productShowCase">
        <div className="productGallery">
          <div className="productThumb">
            {imageIds.map((publicId, index) => (
              <button
                type="button"
                key={publicId}
                onClick={() => setCurrentImg(index)}
                aria-label={`Show image ${index + 1} of ${imageIds.length}`}
                aria-current={index === currentImg}
              >
                <img
                  src={cloudinaryUrl(publicId, { width: 160, version })}
                  alt=""
                  width={80}
                  height={80}
                />
              </button>
            ))}
          </div>

          <div className="productFullImg">
            <img
              src={cloudinaryUrl(imageIds[currentImg], { width: 1000, version })}
              srcSet={cloudinarySrcSet(imageIds[currentImg], [500, 1000], {
                version,
              })}
              sizes="(max-width: 991px) 100vw, 520px"
              alt={`${fullName}, view ${currentImg + 1} of ${imageIds.length}`}
              width={520}
              height={520}
            />

            {imageIds.length > 1 && (
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
              <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>
                {product.category}
              </Link>
              &nbsp;/&nbsp;
              <span aria-current="page">{product.name}</span>
            </div>
          </nav>

          <div className="productName">
            <p className="productBrand">{product.brand}</p>
            <h1>{product.name}</h1>
          </div>

          <div className="productPrice">
            <h3>{formatINR(product.price)}</h3>
            <p>Inclusive of all taxes</p>
          </div>

          {colorSiblings.length > 1 && (
            <div className="productSizeColor">
              <div className="productColor">
                <p>
                  Colour: <span>{product.color}</span>
                </p>
                <div className="colorBtn">
                  {colorSiblings.map((sibling) => (
                    <Tooltip
                      key={sibling.id}
                      title={sibling.color}
                      TransitionComponent={Zoom}
                    >
                      <Link
                        to={`/products/${sibling.slug}`}
                        replace
                        className={sibling.id === product.id ? "highlighted" : ""}
                        style={{ backgroundColor: sibling.colorHex }}
                        aria-label={`Colour: ${sibling.color}`}
                        aria-current={sibling.id === product.id ? "true" : undefined}
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
                disabled={quantity <= 1}
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
                aria-label="Quantity"
                onChange={(event) => {
                  const value = parseInt(event.target.value, 10);
                  if (!Number.isNaN(value)) setClampedQuantity(value);
                }}
              />
              <button
                type="button"
                onClick={() => setClampedQuantity(quantity + 1)}
                disabled={quantity >= MAX_QUANTITY}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <div className="productCartBtn">
              <button type="button" onClick={() => addToCart(product, quantity)}>
                Add to Cart
              </button>
            </div>
          </div>

          <div className="productTags">
            <p>
              <span>PRODUCT CODE: </span>
              {product.id.toUpperCase()}
            </p>
            <p>
              <span>CATEGORY: </span>
              {product.category}
            </p>
            <p>
              <span>BRAND: </span>
              {product.brand}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;
