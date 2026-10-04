import React, { useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import Zoom from "@mui/material/Zoom";

import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";

import { useLocation, Link } from "react-router-dom";

import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { FaStar } from "react-icons/fa";
import { FiHeart } from "react-icons/fi";
import { PiShareNetworkLight } from "react-icons/pi";

import toast from "react-hot-toast";

import "./Product.css";

const Product = () => {
  const location = useLocation();
  const product = location.state?.product;

  // ✅ Hooks FIRST (no breaking rules)
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items);

  const productImg = product?.images || [];

  const [currentImg, setCurrentImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [clicked, setClicked] = useState(false);
  const [selectSize, setSelectSize] = useState("S");
  const [highlightedColor, setHighlightedColor] = useState("#C8393D");

  const sizes = ["XS", "S", "M", "L", "XL"];
  const sizesFullName = [
    "Extra Small",
    "Small",
    "Medium",
    "Large",
    "Extra Large",
  ];

  const colors = ["#222222", "#C8393D", "#E4E4E4"];
  const colorsName = ["Black", "Red", "Grey"];

  const prevImg = () => {
    setCurrentImg(currentImg === 0 ? productImg.length - 1 : currentImg - 1);
  };

  const nextImg = () => {
    setCurrentImg(currentImg === productImg.length - 1 ? 0 : currentImg + 1);
  };

  const increment = () => setQuantity(quantity + 1);
  const decrement = () => quantity > 1 && setQuantity(quantity - 1);

  const handleInputChange = (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) setQuantity(val);
  };

  const handleAddToCart = () => {
    const productDetails = {
      ...product,
      quantity,
    };

    const productInCart = cartItems.find(
      (item) => item.productID === product.productID
    );

    if (productInCart && productInCart.quantity >= 20) {
      toast.error("Product limit reached");
    } else {
      dispatch(addToCart(productDetails));
      toast.success("Added to cart!");
    }
  };

  if (!product) {
    return <h2 style={{ textAlign: "center" }}>No product found</h2>;
  }

  return (
    <div className="productSection">
      <div className="productShowCase">
        {/* LEFT SIDE */}
        <div className="productGallery">
          <div className="productThumb">
            {productImg.map((img, index) => (
              <img
                key={index}
                src={img}
                onClick={() => setCurrentImg(index)}
                alt=""
              />
            ))}
          </div>

          <div className="productFullImg">
            <img
              src={productImg[currentImg]}
              alt=""
              style={{ objectFit: "contain" }} // ✅ FIX squish
            />

            <div className="buttonsGroup">
              <button onClick={prevImg} className="directionBtn">
                <GoChevronLeft size={18} />
              </button>
              <button onClick={nextImg} className="directionBtn">
                <GoChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="productDetails">
          <div className="productBreadcrumb">
            <div className="breadcrumbLink">
              <Link to="/">Home</Link>&nbsp;/&nbsp;
              <Link to="/shop">The Shop</Link>
            </div>
          </div>

          <div className="productName">
            <h1>{product.name}</h1>
          </div>

          <div className="productRating">
            {[...Array(5)].map((_, i) => (
              <FaStar key={i} color="#FEC78A" size={10} />
            ))}
            <p>{product.reviews}</p>
          </div>

          <div className="productPrice">
            <h3>₹ {product.price}</h3>
          </div>

          <div className="productDescription">
            <p>
              Premium eyewear with modern design and high-quality materials.
            </p>
          </div>

          {/* ✅ IMPORTANT: keep this wrapper */}
          <div className="productSizeColor">
            <div className="productSize">
              <p>Sizes</p>
              <div className="sizeBtn">
                {sizes.map((size, index) => (
                  <Tooltip
                    key={size}
                    title={sizesFullName[index]}
                    TransitionComponent={Zoom}
                  >
                    <button
                      onClick={() => setSelectSize(size)}
                      style={{
                        borderColor:
                          selectSize === size ? "#000" : "#e0e0e0",
                      }}
                    >
                      {size}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>

            <div className="productColor">
              <p>Color</p>
              <div className="colorBtn">
                {colors.map((color, index) => (
                  <Tooltip
                    key={color}
                    title={colorsName[index]}
                    TransitionComponent={Zoom}
                  >
                    <button
                      className={
                        highlightedColor === color ? "highlighted" : ""
                      }
                      style={{ backgroundColor: color }}
                      onClick={() => setHighlightedColor(color)}
                    />
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>

          <div className="productCartQuantity">
            <div className="productQuantity">
              <button onClick={decrement}>-</button>
              <input value={quantity} onChange={handleInputChange} />
              <button onClick={increment}>+</button>
            </div>

            <div className="productCartBtn">
              <button onClick={handleAddToCart}>Add to Cart</button>
            </div>
          </div>

          <div className="productWishShare">
            <div className="productWishList">
              <button onClick={() => setClicked(!clicked)}>
                <FiHeart color={clicked ? "red" : ""} size={17} />
                <p>Add to Wishlist</p>
              </button>
            </div>

            <div className="productShare">
              <PiShareNetworkLight size={22} />
              <p>Share</p>
            </div>
          </div>

          <div className="productTags">
            <p>
              <span>SKU: </span>{product.productID}
            </p>
            <p>
              <span>CATEGORY: </span>{product.category}
            </p>
            <p>
              <span>BRAND: </span>{product.brand}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;