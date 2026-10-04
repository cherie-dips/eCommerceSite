import React from "react";
import { useLikes } from "../context/LikesContext";
import ProductCard from "../components/ProductCard";

export default function LikedProducts() {
  const { likedItems } = useLikes();

  return (
    <div className="page-content products-page">
      <h1 className="products-heading">Liked Products</h1>

      {likedItems.length === 0 ? (
        <p style={{ color: "#ccc", marginTop: "2rem" }}>
          You haven’t liked any products yet.
        </p>
      ) : (
        <div className="products-grid">
          {likedItems.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
