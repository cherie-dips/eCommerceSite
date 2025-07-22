// client/src/pages/LikedProducts.jsx

import React from "react";
import { useLikes } from "../context/LikesContext";
import { Link } from "react-router-dom";
import { AiFillHeart } from "react-icons/ai";

export default function LikedProducts() {
  const { likedItems, toggleLike } = useLikes();

  return (
    <div className="page-content">
      <h1 className="products-heading">Liked Products</h1>

      {likedItems.length === 0 ? (
        <p style={{ color: "#ccc", marginTop: "2rem" }}>You haven’t liked any products yet.</p>
      ) : (
        <div className="products-grid">
          {likedItems.map((product) => (
            <div key={product._id} className="product-card">
              {/* Like (heart) icon */}
              <button className="pc-like-float" onClick={() => toggleLike(product)}>
                <AiFillHeart className="pc-like-icon liked" />
              </button>

              {/* Image wrapper with radial background */}
              <Link to={`/products/${product._id}`} className="pc-img-link">
                <div className="pc-imgwrap">
                  <img src={product.image} alt={product.name} className="pc-img" />
                </div>
              </Link>

              {/* Product Name */}
              <h3 className="pc-name">
                <Link to={`/products/${product._id}`}>{product.name}</Link>
              </h3>

              {/* Price */}
              <p className="pc-price">₹{product.price}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
