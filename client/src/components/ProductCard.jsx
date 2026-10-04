import { Link } from "react-router-dom";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { FaCartPlus } from "react-icons/fa";
import { useCart } from "../context/CartContext";
import { useLikes } from "../context/LikesContext";
import { useToast } from "../context/ToastContext";
import { assetUrl } from "../utils/api";
import Stars from "./Stars";

// Product tile with working like and add-to-cart buttons.
// Used on the Home, Products and Liked Products pages.
export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { likedItems, toggleLike } = useLikes();
  const toast = useToast();
  const liked = likedItems.some((item) => item._id === product._id);
  const customizable = product.customizable !== false;

  return (
    <div className="product-card">
      <Link to={`/products/${product._id}`} className="pc-img-link">
        <div className="pc-imgwrap">
          <img src={assetUrl(product.image)} alt={product.name} className="pc-img" loading="lazy" />
          {customizable && <span className="pc-tag">Customisable</span>}
        </div>
      </Link>

      <h3 className="pc-name">
        <Link to={`/products/${product._id}`}>{product.name}</Link>
      </h3>
      {product.ratingCount > 0 && <Stars value={product.ratingAvg} size="0.85rem" />}
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
        {customizable ? (
          <Link to={`/products/${product._id}`} className="btn btn-primary btn-sm">Customise</Link>
        ) : (
          <button
            className="pc-action-btn"
            onClick={() => {
              addToCart(product);
              toast.success(`${product.name} added to your cart.`);
            }}
            aria-label="Add to cart"
          >
            <FaCartPlus className="pc-action-icon" />
          </button>
        )}
      </div>
    </div>
  );
}
