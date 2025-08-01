import React from "react";
import { useLikes } from "../context/LikesContext";
import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { FaCartPlus } from "react-icons/fa";

export default function LikedProducts() {
  const { likedItems, toggleLike } = useLikes();
  const { addToCart } = useCart();

  return (
    <div className="page-content products-page">
      <h1 className="products-heading">Liked Products</h1>

      {likedItems.length === 0 ? (
        <p style={{ color: "#ccc", marginTop: "2rem" }}>
          You haven’t liked any products yet.
        </p>
      ) : (
        <div className="products-grid">
          {likedItems.map((product) => {
            const liked = likedItems.some((item) => item._id === product._id);
            return (
              <div key={product._id} className="product-card">

                {/* Image wrapper */}
                <Link to={`/products/${product._id}`} className="pc-img-link">
                  <div className="pc-imgwrap">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="pc-img"
                    />
                  </div>
                </Link>

                {/* Name & Price */}
                <h3 className="pc-name">
                  <Link to={`/products/${product._id}`}>{product.name}</Link>
                </h3>
                <p className="pc-price">₹{product.price}</p>

                {/* Like & Cart Buttons */}
                <div className="pc-actions">
                  <button
                    className="pc-action-btn"
                    onClick={() => toggleLike(product)}
                    aria-label={liked ? "Unlike" : "Like"}
                  >
                    {liked ? (
                      <AiFillHeart className="pc-action-icon liked" />
                    ) : (
                      <AiOutlineHeart className="pc-action-icon" />
                    )}
                  </button>
                  <button
                    className="pc-action-btn"
                    onClick={() => addToCart(product)}
                    aria-label="Add to cart"
                  >
                    <FaCartPlus className="pc-action-icon" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}