import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useCart } from "../context/CartContext";
import { useLikes } from "../context/LikesContext";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { FaCartPlus } from "react-icons/fa";

export default function Products() {
  const [products, setProducts] = useState([]);
  const { addToCart } = useCart();
  const { likedItems, toggleLike } = useLikes();

  useEffect(() => {
    axios
      .get("http://localhost:5050/api/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  return (
    <div className="page-content products-page">
      <h1 className="products-heading">All Products</h1>

      <div className="products-grid">
        {products.map((product) => {
          const liked = likedItems.some((item) => item._id === product._id);
          return (
            <div key={product._id} className="product-card">
              {/* Like icon floats over image */}
              <button
                className="pc-like-float"
                onClick={() => toggleLike(product)}
                aria-label={liked ? "Unlike" : "Like"}
              >
                {liked ? (
                  <AiFillHeart className="pc-like-icon liked" />
                ) : (
                  <AiOutlineHeart className="pc-like-icon" />
                )}
              </button>

              <Link to={`/products/${product._id}`} className="pc-img-link">
                <div className="pc-imgwrap">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="pc-img"
                  />
                </div>
              </Link>

              <h3 className="pc-name">
                <Link to={`/products/${product._id}`}>{product.name}</Link>
              </h3>
              <p className="pc-price">₹{product.price}</p>

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
    </div>
  );
}