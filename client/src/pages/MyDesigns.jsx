import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { assetUrl, errorMessage } from "../utils/api";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function MyDesigns() {
  const [designs, setDesigns] = useState(null);
  const { addToCart } = useCart();
  const toast = useToast();

  useEffect(() => {
    api.get("/designs/mine").then((res) => setDesigns(res.data)).catch(() => setDesigns([]));
  }, []);

  const remove = async (design) => {
    if (!window.confirm("Delete this design?")) return;
    try {
      await api.delete(`/designs/${design._id}`);
      setDesigns((list) => list.filter((d) => d._id !== design._id));
      toast.success("Design deleted.");
    } catch (err) {
      toast.error(errorMessage(err, "The design couldn't be deleted."));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Designs</h1>
          <p>Designs you've saved or ordered. Open one to change it or order it again.</p>
        </div>
        <Link to="/customize" className="btn btn-primary">New design</Link>
      </div>

      {!designs && <div className="spinner" />}
      {designs?.length === 0 && (
        <div className="empty">
          <h3>No designs yet</h3>
          <p>Start with a product and upload your logo or photo.</p>
          <Link to="/customize" className="btn btn-primary">Design something</Link>
        </div>
      )}
      <div className="choose-grid">
        {designs?.map((d) => {
          const product = d.productId;
          const available = product && product.active !== false;
          return (
            <div key={d._id} className="choose-card">
              <img src={assetUrl(d.previewPath)} alt={d.name} loading="lazy" />
              <div className="choose-info">
                <strong>{product?.name || "Product removed"}</strong>
                <span className="muted small">
                  {d.mode === "3d" ? "3D design · " : ""}{new Date(d.createdAt).toLocaleDateString()}
                  {d.views.length > 1 ? ` · ${d.views.length} sides` : ""}
                </span>
              </div>
              <div className="row">
                {available && d.mode === "2d" && (
                  <Link to={`/products/${product._id}?design=${d._id}`} className="btn btn-secondary btn-sm">Open</Link>
                )}
                {available && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      addToCart(product, d);
                      toast.success("Added to your cart.");
                    }}
                  >
                    Add to cart
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => remove(d)} title="Delete">✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
