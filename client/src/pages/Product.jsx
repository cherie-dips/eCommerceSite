import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useCart } from "../context/CartContext";
import { useLikes } from "../context/LikesContext";

export default function Products() {
  const [products, setProducts] = useState([]);
  const { addToCart } = useCart();
  const { likedItems, toggleLike } = useLikes();

  useEffect(() => {
    axios.get("http://localhost:5050/api/products")
      .then(res => setProducts(res.data))
      .catch(err => console.error("Error fetching products:", err));
  }, []);

  return (
    <div className="page-content">
      <h1>All Products</h1>
      <div className="products">
        {products.map((product) => (
          <div key={product._id} className="product-card">
            <img src={product.image} alt={product.name} />
            <h3>
              <Link to={`/products/${product._id}`}>{product.name}</Link>
            </h3>
            <p>₹{product.price}</p>
            <button onClick={() => toggleLike(product)}>
              {likedItems.some(item => item._id === product._id) ? "💔 Unlike" : "❤️ Like"}
            </button>
            <button onClick={() => addToCart(product)}>Add to Cart 🛒</button>
          </div>
        ))}
      </div>
    </div>
  );
}