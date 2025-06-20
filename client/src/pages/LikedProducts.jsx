// client/src/pages/LikedProducts.jsx
import React from "react";
import { useLikes } from "../context/LikesContext";
import { Link } from "react-router-dom";

export default function LikedProducts() {
  const { likedItems } = useLikes();

  return (
    <div className="page-content">
      <h1>Liked Products</h1>
      <div className="products">
        {likedItems.map((product) => (
          <div key={product._id} className="product-card">
            <img src={product.image} alt={product.name} />
            <h3><Link to={`/products/${product._id}`}>{product.name}</Link></h3>
            <p>₹{product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}