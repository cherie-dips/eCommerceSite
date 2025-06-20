import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useState } from "react";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const [liked, setLiked] = useState(false);

  const handleLike = () => setLiked((prev) => !prev);

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="product-image" />
      <h2 className="product-name">{product.name}</h2>
      <p className="product-price">₹{product.price}</p>

      <div className="product-actions">
        <button className="like-button" onClick={handleLike}>
          {liked ? "💔 Unlike" : "❤️ Like"}
        </button>
        <button className="cart-button" onClick={() => addToCart(product)}>
          Add to Cart 🛒
        </button>
      </div>

      <Link to={`/product/${product._id}`} className="details-link">
        View Details
      </Link>
    </div>
  );
};

export default ProductCard;