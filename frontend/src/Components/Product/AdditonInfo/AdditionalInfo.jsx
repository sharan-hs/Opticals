import React from "react";
import "./AdditionalInfo.css";

// Product specifications. Rows without a value are skipped, so new fields
// can be added to the catalogue without touching this component.
const AdditionalInfo = ({ product }) => {
  const rows = [
    ["Brand", product.brand],
    ["Model", product.model],
    ["Colour", product.color],
    ["Category", product.category],
    ["Product code", product.id.toUpperCase()],
    ...(product.specs || []).map((spec) => [spec.label, spec.value]),
  ].filter(([, value]) => value);

  return (
    <section className="productAdditionalInfo" aria-labelledby="product-details">
      <h2 id="product-details">Product Details</h2>
      {product.description && (
        <p className="productAdditionalDescription">{product.description}</p>
      )}
      <dl className="productSpecs">
        {rows.map(([label, value]) => (
          <div className="productSpecsRow" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default AdditionalInfo;
