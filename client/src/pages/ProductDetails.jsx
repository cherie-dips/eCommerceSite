import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api, { assetUrl, errorMessage } from "../utils/api";
import DesignStudio from "../design/DesignStudio";
import Stars from "../components/Stars";
import "../styles/DesignStudio.css";

function Reviews({ product, onRated }) {
  const { user } = useAuth();
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/products/${product._id}/reviews`).then((res) => setReviews(res.data)).catch(() => {});
  }, [product._id]);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post(`/products/${product._id}/reviews`, { rating, comment });
      toast.success("Thanks for your review!");
      onRated(res.data);
      const list = await api.get(`/products/${product._id}/reviews`);
      setReviews(list.data);
      setComment("");
    } catch (err) {
      toast.error(errorMessage(err, "Your review could not be saved."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card">
      <h2 className="section-title">Reviews</h2>
      {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      {reviews.map((r) => (
        <div className="review" key={r._id}>
          <div className="row-between">
            <strong>{r.username}</strong>
            <Stars value={r.rating} />
          </div>
          {r.comment && <p style={{ margin: "0.3rem 0 0" }}>{r.comment}</p>}
          <span className="muted small">{new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
      ))}
      {user && (
        <form onSubmit={submit} style={{ marginTop: "1rem" }}>
          <div className="field">
            <label>Your rating</label>
            <select className="select" value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ maxWidth: 220 }}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{"★".repeat(n)} ({n})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Comment (optional)</label>
            <textarea className="textarea" value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} />
            <span className="hint">You can review products you have ordered.</span>
          </div>
          <button className="btn btn-secondary" disabled={sending}>{sending ? "Sending..." : "Post review"}</button>
        </form>
      )}
    </div>
  );
}

const ProductDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const designId = searchParams.get("design");
  const { addToCart } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [initialDesign, setInitialDesign] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [photo, setPhoto] = useState(0);

  // Fetch product data
  useEffect(() => {
    setProduct(null);
    setLoadError("");
    api
      .get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => {
        console.error("Error fetching product:", err);
        setLoadError(
          err.response?.status === 404
            ? "Sorry, this product doesn't exist."
            : "Couldn't load this product. Please try again."
        );
      });
  }, [id]);

  // Open a saved design (from My Designs)
  useEffect(() => {
    if (!designId || !user) return;
    api
      .get(`/designs/${designId}`)
      .then((res) => {
        if (res.data.productId === id && res.data.mode === "2d") setInitialDesign(res.data);
      })
      .catch(() => toast.error("That design could not be opened."));
  }, [designId, id, user, toast]);

  if (loadError) {
    return (
      <div className="page" style={{ textAlign: "center" }}>
        <div className="empty">
          <h3>{loadError}</h3>
          <Link to="/products" className="btn btn-primary">Browse all products</Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="page"><div className="spinner" /></div>;
  }

  const outOfStock = product.stock === 0;
  const photos = [product.image, product.images?.back, product.images?.side].filter(Boolean);

  const addPlain = () => {
    addToCart(product, null, quantity);
    toast.success(`${product.name} added to your cart.`);
  };

  const addDesign = (design, qty) => {
    addToCart(product, design, qty);
    toast.success("Your design was added to the cart.");
    navigate("/cart");
  };

  return (
    <div className="page" style={{ maxWidth: 1280 }}>
      <div className="product-head">
        <div>
          <Link to="/products" className="small">← All products</Link>
          <h1>{product.name}</h1>
          <div className="product-meta">
            <Stars value={product.ratingAvg} count={product.ratingCount} />
            <span className="badge">{product.category}</span>
            {product.retailerId?.username && <span>Sold by {product.retailerId.username}</span>}
            {outOfStock ? (
              <span className="badge badge-danger">Out of stock</span>
            ) : product.stock <= 10 ? (
              <span className="badge badge-warning">Only {product.stock} left</span>
            ) : (
              <span className="badge badge-success">In stock</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>₹{product.price}</div>
          {product.customizable !== false && !outOfStock && (
            <button className="btn btn-ghost btn-sm" onClick={addPlain}>Add without a design</button>
          )}
        </div>
      </div>

      {product.customizable !== false ? (
        <>
          <DesignStudio
            key={`${product._id}-${initialDesign?._id || "new"}`}
            product={product}
            initialDesign={initialDesign}
            onAddToCart={addDesign}
            onSaved={() => {}}
          />
          {product.model3d === "mug" && (
            <p className="muted small" style={{ marginTop: "0.75rem" }}>
              Want to place logos anywhere around the mug? Try the <Link to={`/customize-3d?product=${product._id}`}>3D logo lab</Link>.
            </p>
          )}
        </>
      ) : (
        <div className="product-plain">
          <div className="product-gallery">
            <img src={assetUrl(photos[photo])} alt={product.name} />
            {photos.length > 1 && (
              <div className="gallery-thumbs">
                {photos.map((p, i) => (
                  <button key={p} className={i === photo ? "active" : ""} onClick={() => setPhoto(i)}>
                    <img src={assetUrl(p)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <p>{product.description || "No description yet."}</p>
            <div className="row" style={{ marginTop: "1rem" }}>
              <div className="qty">
                <button className="btn btn-secondary btn-sm" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <span>{quantity}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setQuantity((q) => Math.min(100, q + 1))}>+</button>
              </div>
              <button className="btn btn-primary" onClick={addPlain} disabled={outOfStock}>
                {outOfStock ? "Out of stock" : "Add to cart"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginTop: "1.5rem" }}>
        <div className="card">
          <h2 className="section-title">About this product</h2>
          <p style={{ whiteSpace: "pre-line" }}>{product.description || "No description yet."}</p>
          {product.customizable !== false && (
            <p className="muted small">
              Printable area: {product.printAreas?.front?.widthCm || 20} cm wide on the front
              {product.images?.back ? ", and on the back too" : ""}.
            </p>
          )}
        </div>
        <Reviews product={product} onRated={(r) => setProduct((p) => ({ ...p, ratingAvg: r.ratingAvg, ratingCount: r.ratingCount }))} />
      </div>
    </div>
  );
};

export default ProductDetails;
