import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { assetUrl } from "../utils/api";

// "Design your own": choose a product to customise, or open the 3D logo lab.
export default function CustomizationPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/products", { params: { customizable: "true", sort: "popular", limit: 24 } })
      .then((res) => setProducts(res.data.products))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Design your own</h1>
          <p>Pick a product, upload your logo or photo, and choose from instant design ideas.</p>
        </div>
        <Link to="/customize-3d" className="btn btn-secondary">Open the 3D logo lab</Link>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : products.length === 0 ? (
        <div className="empty">
          <h3>No customisable products yet</h3>
          <p>Sellers haven't added any products you can design yet. Please check back soon.</p>
        </div>
      ) : (
        <div className="choose-grid">
          {products.map((p) => (
            <Link key={p._id} to={`/products/${p._id}`} className="choose-card">
              <img src={assetUrl(p.image)} alt={p.name} loading="lazy" />
              <div className="choose-info">
                <strong>{p.name}</strong>
                <span className="muted small">from ₹{p.price}{p.images?.back ? " · front & back" : ""}{p.model3d ? " · 3D preview" : ""}</span>
              </div>
              <span className="btn btn-primary btn-sm">Design this</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
