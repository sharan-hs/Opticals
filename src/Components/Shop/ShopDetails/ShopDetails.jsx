import React, { useState, useEffect } from "react";
import "./ShopDetails.css";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";
import { getProductImages } from "../../../Utils/cloudinary";
import Filter from "../Filters/Filter";
import { Link } from "react-router-dom";
// import StoreData from "../../../Data/StoreData";
import { productMeta } from "../../../Utils/metadata" // create this file

import { FiHeart } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { IoFilterSharp, IoClose } from "react-icons/io5";
import { FaAngleRight, FaAngleLeft } from "react-icons/fa6";
import { FaCartPlus } from "react-icons/fa";
import toast from "react-hot-toast";

const ShopDetails = () => {
  const dispatch = useDispatch();
  const [wishList, setWishList] = useState({});
  const [products, setProducts] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: "All",
    price: [0, 20000],
    brands: [],
    colors: [], // 👈 ADD
  });

  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 6;

  const handleWishlistClick = (productID) => {
    setWishList((prevWishlist) => ({
      ...prevWishlist,
      [productID]: !prevWishlist[productID],
    }));
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const cartItems = useSelector((state) => state.cart.items);



  useEffect(() => {
    const generatedProducts = Object.keys(productMeta).map((id) => {
      const imgs = getProductImages(id, 6);

      console.log("Product:", id);
      console.log("Images:", imgs);

      return {
        productID: id,
        ...productMeta[id],
        images: imgs,
      };
    });

    setProducts(generatedProducts);
  }, []);



  const handleAddToCart = (product) => {
    const productInCart = cartItems.find(
      (item) => item.productID === product.productID
    );

    if (productInCart && productInCart.quantity >= 20) {
      toast.error("Product limit reached", {
        duration: 2000,
        style: {
          backgroundColor: "#ff4b4b",
          color: "white",
        },
        iconTheme: {
          primary: "#fff",
          secondary: "#ff4b4b",
        },
      });
    } else {
      dispatch(addToCart(product));
      toast.success(`Added to cart!`, {
        duration: 2000,
        style: {
          backgroundColor: "#07bc0c",
          color: "white",
        },
        iconTheme: {
          primary: "#fff",
          secondary: "#07bc0c",
        },
      });
    }
  };

  const handleFilterChange = ({ category, price, brands, colors }) => {
    setFilters({ category, price, brands, colors });
  };

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
    setCurrentPage(1);
  };



  const filteredProducts = products.filter((product) => {
    let categoryMatch = filters.category === "All" ||
      product.category?.toLowerCase().includes(filters.category.toLowerCase());

    let priceMatch =
      product.price >= filters.price[0] &&
      product.price <= filters.price[1];

    let brandMatch =
      filters.brands.length === 0 ||
      filters.brands.some((brand) =>
        product.brand?.toLowerCase().includes(brand.toLowerCase())
      );

    let colorMatch =
      filters.colors.length === 0 ||
      filters.colors.includes(product.color); // 👈 IMPORTANT

    return categoryMatch && priceMatch && brandMatch && colorMatch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortOption) {
      case "lowToHigh":
        return a.price - b.price;
      case "highToLow":
        return b.price - a.price;
      case "a-z":
        return a.name.localeCompare(b.name);
      case "z-a":
        return b.name.localeCompare(a.name);
      case "bestSelling":
        const getReviewCount = (reviews) =>
          parseInt(reviews.replace(/\D/g, "")) *
          (reviews.includes("k") ? 1000 : 1);
        return (
          getReviewCount(b.reviews) - getReviewCount(a.reviews)
        );
      case "newToOld":
      case "oldToNew":
        return sortOption === "newToOld"
          ? b.productID - a.productID
          : a.productID - b.productID;
      default:
        return a.productID - b.productID;
    }
  });

  // Pagination logic
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    scrollToTop();
  };

  return (
    <>
      <div className="shopDetails">
        <div className="shopDetailMain">
          <div className="shopDetails__left">
            <Filter
              onFilterChange={handleFilterChange}
              products={products}
            />
          </div>
          <div className="shopDetails__right">
            <div className="shopDetailsSorting">
              <div className="shopDetailsBreadcrumbLink">
                <Link to="/" onClick={scrollToTop}>
                  Home
                </Link>
                &nbsp;/&nbsp;
                <Link to="/shop">The Shop</Link>
              </div>
              <div className="filterLeft" onClick={toggleDrawer}>
                <IoFilterSharp />
                <p>Filter</p>
              </div>
              <div className="shopDetailsSort">
                <select
                  name="sort"
                  id="sort"
                  onChange={handleSortChange}
                  value={sortOption}
                >
                  <option value="default">Default Sorting</option>
                  <option value="bestSelling">Best Selling</option>
                  <option value="a-z">Alphabetically, A-Z</option>
                  <option value="z-a">Alphabetically, Z-A</option>
                  <option value="lowToHigh">Price, Low to high</option>
                  <option value="highToLow">Price, high to low</option>
                  <option value="oldToNew">Date, old to new</option>
                  <option value="newToOld">Date, new to old</option>
                </select>
                <div className="filterRight" onClick={toggleDrawer}>
                  <div className="filterSeprator"></div>
                  <IoFilterSharp />
                  <p>Filter</p>
                </div>
              </div>
            </div>
            <div className="shopDetailsProducts">
              <div className="shopDetailsProductsContainer">
                {currentProducts.length > 0 ? (
                  currentProducts.map((product) => (
                    <div className="sdProductContainer" key={product.productID}>
                      <div className="sdProductImages">
                        <Link to="/product" state={{ product }}>
                          <img
                            src={product.images[0]}
                            alt=""
                            className="sdProduct_front"
                          />
                          {product.images[1] && (
                            <img
                              src={product.images[1]}
                              alt=""
                              className="sdProduct_back"
                              onError={(e) => (e.target.style.display = "none")}
                            />
                          )}
                        </Link>
                        <h4 onClick={() => handleAddToCart(product)}>
                          Add to Cart
                        </h4>
                      </div>
                      <div
                        className="sdProductImagesCart"
                        onClick={() => handleAddToCart(product)}
                      >
                        <FaCartPlus />
                      </div>
                      <div className="sdProductInfo">
                        <div className="sdProductCategoryWishlist">
                          <p>
                            {product.name
                              .toLowerCase()
                              .includes("sunglasses")
                              ? "Sunglasses"
                              : product.name
                                .toLowerCase()
                                .includes("blue light")
                                ? "Blue Light Glasses"
                                : "Reading Glasses"}
                          </p>
                          <FiHeart
                            onClick={() =>
                              handleWishlistClick(product.productID)
                            }
                            style={{
                              color: wishList[product.productID]
                                ? "red"
                                : "#767676",
                              cursor: "pointer",
                            }}
                          />
                        </div>
                        <div className="sdProductNameInfo">
                          <Link to="/product" state={{ product }}>
                            <h5>{product.name}</h5>
                          </Link>
                          <p>₹{product.price}</p>
                          <div className="sdProductRatingReviews">
                            <div className="sdProductRatingStar">
                              <FaStar color="#FEC78A" size={10} />
                              <FaStar color="#FEC78A" size={10} />
                              <FaStar color="#FEC78A" size={10} />
                              <FaStar color="#FEC78A" size={10} />
                              <FaStar color="#FEC78A" size={10} />
                            </div>
                            <span>{product.reviews}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No products match the selected filters.</p>
                )}
              </div>
            </div>
            <div className="shopDetailsPagination">
              <div className="sdPaginationPrev">
                <p
                  onClick={() =>
                    currentPage > 1 && handlePageChange(currentPage - 1)
                  }
                  style={{
                    cursor: currentPage > 1 ? "pointer" : "not-allowed",
                    opacity: currentPage > 1 ? 1 : 0.5,
                  }}
                >
                  <FaAngleLeft />
                  Prev
                </p>
              </div>
              <div className="sdPaginationNumber">
                <div className="paginationNum">
                  {[...Array(totalPages)].map((_, index) => (
                    <p
                      key={index + 1}
                      onClick={() => handlePageChange(index + 1)}
                      style={{
                        fontWeight:
                          currentPage === index + 1 ? "bold" : "normal",
                        cursor: "pointer",
                      }}
                    >
                      {index + 1}
                    </p>
                  ))}
                </div>
              </div>
              <div className="sdPaginationNext">
                <p
                  onClick={() =>
                    currentPage < totalPages &&
                    handlePageChange(currentPage + 1)
                  }
                  style={{
                    cursor:
                      currentPage < totalPages ? "pointer" : "not-allowed",
                    opacity: currentPage < totalPages ? 1 : 0.5,
                  }}
                >
                  Next
                  <FaAngleRight />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`filterDrawer ${isDrawerOpen ? "open" : ""}`}>
        <div className="drawerHeader">
          <p>Filter By</p>
          <IoClose onClick={closeDrawer} className="closeButton" size={26} />
        </div>
        <div className="drawerContent">
          <Filter
            onFilterChange={handleFilterChange}
            products={products}
          />
        </div>
      </div>
    </>
  );
};

export default ShopDetails;
