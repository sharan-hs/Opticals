import React from "react";
import "./Trendy.css";
import { Link } from "react-router-dom";

import ProductCard from "../../ProductCard/ProductCard";
import { getProducts } from "../../../Data/catalog";

const Trendy = () => (
  <section className="trendyProducts" aria-labelledby="trendy-heading">
    <h2 id="trendy-heading">
      Our Trendy <span>Products</span>
    </h2>
    <div className="trendyMainContainer">
      {getProducts()
        .slice(0, 8)
        .map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
    </div>
    <div className="discoverMore">
      <Link to="/shop">Discover More</Link>
    </div>
  </section>
);

export default Trendy;
