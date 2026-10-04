import React from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";

import AdditionalInfo from "../Components/Product/AdditonInfo/AdditionalInfo";
import Product from "../Components/Product/ProductMain/Product";
import ProductSeo from "../Components/Product/ProductSeo";
import RelatedProducts from "../Components/Product/RelatedProducts/RelatedProducts";
import PageLoading from "../Components/PageLoading/PageLoading";
import { errorMessage } from "../Api/errors";
import { LEGACY_PRODUCT_URLS } from "../Data/legacyProductUrls";
import { useGetProductQuery } from "../Features/Catalog/catalogApi";
import useDocumentTitle from "../Utils/useDocumentTitle";
import "../Components/Error/Error.css";

// ?variant=SKU picks the colour; otherwise the first one in stock.
const pickVariant = (product, sku) =>
  product.variants.find((v) => v.sku === sku) ??
  product.variants.find((v) => v.availability !== "out") ??
  product.variants[0];

const ProductDetails = () => {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: product, error, isLoading, refetch } = useGetProductQuery(slug);

  useDocumentTitle(
    product
      ? `${product.brand.name} ${product.name}`
      : error?.status === 404
        ? "Product not found"
        : "Product"
  );

  if (isLoading) return <PageLoading />;

  if (error?.status === 404) {
    const legacy = LEGACY_PRODUCT_URLS[slug];
    if (legacy) return <Navigate to={`/products/${legacy.slug}?variant=${legacy.sku}`} replace />;
    return (
      <div className="errorContainer">
        <h1 className="errorSmallTitle">Product not found</h1>
        <p>This product may have been removed or the link is incorrect.</p>
        <Link to="/shop">Back to the shop</Link>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="errorContainer" role="alert">
        <h1 className="errorSmallTitle">We couldn’t load this product</h1>
        <p>{errorMessage(error)}</p>
        <button type="button" className="secondaryButton" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  const variant = pickVariant(product, params.get("variant"));
  const selectVariant = (sku) => setParams({ variant: sku }, { replace: true });

  // `key` resets gallery and quantity state when the product or colour changes.
  return (
    <React.Fragment key={`${product.id}-${variant.id}`}>
      <ProductSeo product={product} variant={variant} />
      <Product product={product} variant={variant} onSelectVariant={selectVariant} />
      <AdditionalInfo product={product} variant={variant} />
      <RelatedProducts slug={product.slug} />
    </React.Fragment>
  );
};

export default ProductDetails;
