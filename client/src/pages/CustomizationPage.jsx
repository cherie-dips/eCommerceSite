import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../utils/api";
import ProductGallery from "../components/ProductGallery";
import { BUILT_IN_MODELS } from "../components/three/builtInModels";

const BUILT_IN_ORDER = Object.keys(BUILT_IN_MODELS);
// Sellers' products (uploaded models) first, then the demo products in a fixed order
const showOrder = (p) => (p.modelFile ? -1 : BUILT_IN_ORDER.indexOf(p.model3d));

// The shop: every product as a 3D model.
export default function CustomizationPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/products", { params: { sort: "popular", limit: 48 } })
      // Sorting is stable, so sellers' products stay most popular first
      .then((res) => setProducts([...res.data.products].sort((a, b) => showOrder(a) - showOrder(b))))
      .catch(() => setError("Couldn't load products. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(products.map((p) => p.category))];
  const shown = category ? products.filter((p) => p.category === category) : products;
  const chooseCategory = (value) => setParams(value ? { category: value } : {});

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">The collection</span>
          <h1>Pick something to <em>make yours.</em></h1>
          <p>Every product is a real 3D model. Turn it around, add your logo, photo or text, and see it on the product before you order.</p>
        </div>
        {!loading && <span className="mono small muted">{shown.length} product{shown.length === 1 ? "" : "s"}</span>}
      </div>

      {categories.length > 1 && (
        <div className="chip-row" role="group" aria-label="Category">
          {["", ...categories].map((c) => (
            <button key={c || "all"} className={`chip ${c === category ? "active" : ""}`} onClick={() => chooseCategory(c)}>
              {c || "All"}
            </button>
          ))}
        </div>
      )}

      {error && <div className="notice notice-danger">{error}</div>}
      {loading ? (
        <div className="spinner" />
      ) : shown.length === 0 ? (
        <div className="empty">
          <h3>Nothing here yet</h3>
          <p>New products are on their way. Please check back soon.</p>
          {category && <button className="btn btn-secondary" onClick={() => chooseCategory("")}>Show all products</button>}
        </div>
      ) : (
        <>
          <ProductGallery products={shown} />
          <p className="gallery-hint">Drag any product to turn it</p>
        </>
      )}
    </div>
  );
}
