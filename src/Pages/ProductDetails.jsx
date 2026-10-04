import React from "react";
import { Link, useParams } from "react-router-dom";

import AdditionalInfo from "../Components/Product/AdditonInfo/AdditionalInfo";
import Product from "../Components/Product/ProductMain/Product";
import RelatedProducts from "../Components/Product/RelatedProducts/RelatedProducts";
import { getProductBySlug } from "../Data/catalog";
import useDocumentTitle from "../Utils/useDocumentTitle";
import "../Components/Error/Error.css";

const ProductDetails = () => {
  const { slug } = useParams();
  const product = getProductBySlug(slug);

  useDocumentTitle(product ? `${product.brand} ${product.name}` : "Product not found");

  if (!product) {
    return (
      <div className="errorContainer">
        <h1 className="errorSmallTitle">Product not found</h1>
        <p>This product may have been removed or the link is incorrect.</p>
        <Link to="/shop">Back to the shop</Link>
      </div>
    );
  }

  // `key` resets gallery and quantity state when switching between products.
  return (
    <React.Fragment key={product.id}>
      <Product product={product} />
      <AdditionalInfo product={product} />
      <RelatedProducts product={product} />
    </React.Fragment>
  );
};

export default ProductDetails;
