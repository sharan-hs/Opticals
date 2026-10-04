import React from "react";
import "./AdditionalInfo.css";

const label = (value) => value && value.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

const sizeText = (variant) => {
  const parts = [variant.lens_width_mm, variant.bridge_mm, variant.temple_mm];
  return parts.every(Boolean) ? `${parts.join("-")} mm (lens-bridge-temple)` : variant.size_label;
};

// Product specifications. Rows without a value are skipped.
const AdditionalInfo = ({ product, variant }) => {
  const rows = [
    ["Brand", product.brand.name],
    ["Model", product.model_number],
    ["Colour", variant.color_name],
    ["Size", sizeText(variant)],
    ["Frame shape", label(product.frame_shape)],
    ["Frame type", label(product.frame_type)],
    ["Material", label(product.frame_material)],
    ["Category", product.category.name],
    ["SKU", variant.sku],
    ...(product.specifications || []).map((spec) => [spec.label, spec.value]),
  ].filter(([, value]) => value);

  return (
    <section className="productAdditionalInfo" aria-labelledby="product-details">
      <h2 id="product-details">Product Details</h2>
      {product.description && (
        <p className="productAdditionalDescription">{product.description}</p>
      )}
      <dl className="productSpecs">
        {rows.map(([name, value]) => (
          <div className="productSpecsRow" key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default AdditionalInfo;
