import React, { Suspense, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, PerspectiveCamera, View } from "@react-three/drei";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import api from "../utils/api";
import { useLikes } from "../context/LikesContext";
import Stars from "../components/Stars";
import ProductModel, { FitModel, ModelErrorBoundary } from "../components/three/ProductModel";
import { BUILT_IN_MODELS } from "../components/three/builtInModels";
import "../styles/Product.css";

const BUILT_IN_ORDER = Object.keys(BUILT_IN_MODELS);
// Sellers' products (uploaded models) first, then the demo products in a fixed order
const showOrder = (p) => (p.modelFile ? -1 : BUILT_IN_ORDER.indexOf(p.model3d));

// One product turning slowly in its card; drag to turn it yourself.
function ModelStage({ product }) {
  const [middle, setMiddle] = useState(0.5);
  return (
    <>
      <PerspectiveCamera makeDefault position={[1.1, 0.85, 2.35]} fov={30} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 3, 2.5]} intensity={0.95} />
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.45} />
      </Suspense>
      <ModelErrorBoundary>
        <Suspense fallback={null}>
          <FitModel onFit={(height) => setMiddle(height / 2)}>
            <ProductModel product={product} />
          </FitModel>
          <ContactShadows frames={1} scale={2.2} blur={2.4} far={1.2} opacity={0.35} />
        </Suspense>
      </ModelErrorBoundary>
      <OrbitControls
        makeDefault
        target={[0, middle, 0]}
        autoRotate
        autoRotateSpeed={1.4}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={0.5}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

// The shop: every product as a 3D model.
export default function CustomizationPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { likedItems, toggleLike } = useLikes();
  const pageRef = useRef(null);

  useEffect(() => {
    api
      .get("/products", { params: { sort: "popular", limit: 48 } })
      .then((res) => {
        // Sorting is stable, so sellers' products stay most popular first
        setProducts([...res.data.products].sort((a, b) => showOrder(a) - showOrder(b)));
      })
      .catch(() => setError("Couldn't load products. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(products.map((p) => p.category))];
  const shown = category ? products.filter((p) => p.category === category) : products;
  const chooseCategory = (value) => setParams(value ? { category: value } : {});

  return (
    <div className="page" ref={pageRef}>
      <div className="page-header">
        <div>
          <h1>Design your own</h1>
          <p>Pick a product, upload your logo or photo, and choose from instant design ideas.</p>
        </div>
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
          <h3>No products here yet</h3>
          <p>Please check back soon.</p>
          {category && <button className="btn btn-secondary" onClick={() => chooseCategory("")}>Show all products</button>}
        </div>
      ) : (
        <div className="choose-grid">
          {shown.map((product, i) => {
            const liked = likedItems.some((item) => item._id === product._id);
            return (
              <div key={product._id} className="choose-card">
                <View className="choose-stage" index={i + 1}>
                  <ModelStage product={product} />
                </View>
                <div className="choose-info">
                  <Link to={`/products/${product._id}`} className="choose-name">{product.name}</Link>
                  {product.ratingCount > 0 && <Stars value={product.ratingAvg} size="0.85rem" />}
                  <span className="muted small">from ₹{product.price}{product.images?.back ? " · front & back" : ""}</span>
                </div>
                <div className="choose-actions">
                  <Link to={`/products/${product._id}`} className="btn btn-primary btn-sm">
                    {product.customizable === false ? "View" : "Design this"}
                  </Link>
                  <button className="pc-action-btn" onClick={() => toggleLike(product)} aria-label={liked ? "Unlike" : "Like"}>
                    {liked ? <AiFillHeart className="pc-action-icon liked" /> : <AiOutlineHeart className="pc-action-icon" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {shown.length > 0 && <p className="muted small choose-hint">Drag a product to turn it around.</p>}

      {/* One shared 3D canvas draws every product into its card */}
      <Canvas className="choose-canvas" eventSource={pageRef} flat dpr={[1, 2]} style={{ position: "fixed", inset: 0, zIndex: 5 }}>
        <View.Port />
      </Canvas>
    </div>
  );
}
