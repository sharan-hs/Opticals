import React from "react";
import "./CollectionBox.css";

import { Link } from "react-router-dom";

// TODO: link each tile to a filtered shop view once products carry a
// gender attribute (docs/TASKS.md 1.9.2).
const CollectionTile = ({ className, label }) => (
  <div className={className}>
    <p className="col-p">Hot List</p>
    <h3 className="col-h3">
      <span>{label}</span> Collection
    </h3>
    <div className="col-link">
      <Link to="/shop" aria-label={`Shop the ${label} collection`}>
        <h5>Shop Now</h5>
      </Link>
    </div>
  </div>
);

const CollectionBox = () => (
  <section className="collection" aria-label="Collections">
    <CollectionTile className="collectionLeft" label="Women" />
    <div className="collectionRight">
      <CollectionTile className="collectionTop" label="Men" />
      <CollectionTile className="collectionBottom" label="Kids" />
    </div>
  </section>
);

export default CollectionBox;
