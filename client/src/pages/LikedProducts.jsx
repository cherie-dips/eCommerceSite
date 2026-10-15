import { Link } from "react-router-dom";
import { useLikes } from "../context/LikesContext";
import ProductGallery from "../components/ProductGallery";

export default function LikedProducts() {
  const { likedItems } = useLikes();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Saved for later</span>
          <h1>Things you <em>liked</em></h1>
        </div>
      </div>

      {likedItems.length === 0 ? (
        <div className="empty">
          <h3>No favourites yet</h3>
          <p>Tap the heart on any product to keep it here.</p>
          <Link to="/customize" className="btn btn-primary">Browse products</Link>
        </div>
      ) : (
        <ProductGallery products={likedItems} />
      )}
    </div>
  );
}
