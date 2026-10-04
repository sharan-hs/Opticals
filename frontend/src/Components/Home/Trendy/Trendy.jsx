import React from "react";
import "./Trendy.css";
import { Link } from "react-router-dom";

import ProductCard, { ProductCardSkeleton } from "../../ProductCard/ProductCard";
import { useGetProductsQuery } from "../../../Features/Catalog/catalogApi";

const COUNT = 8;

// Featured products first (admin "featured" flag), then the newest.
const Trendy = () => {
  const { data, isLoading, isError } = useGetProductsQuery({ sort: "featured", page_size: COUNT });
  if (isError || (data && data.items.length === 0)) return null;

  return (
    <section className="trendyProducts" aria-labelledby="trendy-heading">
      <h2 id="trendy-heading">
        Our Trendy <span>Products</span>
      </h2>
      <div className="trendyMainContainer" aria-busy={isLoading}>
        {isLoading
          ? Array.from({ length: COUNT }, (_, index) => <ProductCardSkeleton key={index} />)
          : data.items.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      <div className="discoverMore">
        <Link to="/shop">Discover More</Link>
      </div>
    </section>
  );
};

export default Trendy;
