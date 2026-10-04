import React from "react";
import { Helmet } from "react-helmet-async";

import { imageUrl } from "../../Utils/cloudinary";

const SCHEMA_AVAILABILITY = {
  in_stock: "https://schema.org/InStock",
  low: "https://schema.org/LimitedAvailability",
  out: "https://schema.org/OutOfStock",
};

// Meta description and schema.org Product data for search engines.
const ProductSeo = ({ product, variant }) => {
  const fullName = `${product.brand.name} ${product.name}`;
  const description =
    product.description?.slice(0, 160) ||
    `${fullName} ${product.category.name.toLowerCase()} in ${product.variants.length} ${
      product.variants.length === 1 ? "colour" : "colours"
    } at Vijai Opticians, Bengaluru.`;
  const images = [...variant.images, ...product.images]
    .slice(0, 3)
    .map((image) => imageUrl(image, 1000));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: fullName,
    description,
    sku: variant.sku,
    mpn: product.model_number ?? undefined,
    brand: { "@type": "Brand", name: product.brand.name },
    category: product.category.name,
    color: variant.color_name,
    image: images,
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      priceCurrency: "INR",
      price: (v.price_paise / 100).toFixed(2),
      availability: SCHEMA_AVAILABILITY[v.availability],
      itemCondition: "https://schema.org/NewCondition",
    })),
  };

  return (
    <Helmet>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullName} />
      <meta property="og:description" content={description} />
      {images[0] && <meta property="og:image" content={images[0]} />}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

export default ProductSeo;
