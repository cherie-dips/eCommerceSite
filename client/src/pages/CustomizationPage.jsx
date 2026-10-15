import React, { Suspense, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, PerspectiveCamera, View } from "@react-three/drei";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import api from "../utils/api";
import { useLikes } from "../context/LikesContext";
import Stars from "../components/Stars";
import { FitModel, PRODUCT_MODELS } from "../components/three/productModels";
import "../styles/Product.css";

const MODELS = Object.fromEntries(PRODUCT_MODELS.map((m) => [m.key, m.Model]));
const TYPE_ORDER = PRODUCT_MODELS.map((m) => m.key);

// One product turning slowly in its card; drag to turn it yourself.
function ModelStage({ model }) {
  const Model = model;
  const [middle, setMiddle] = useState(0.5);
  return (
    <>
      <PerspectiveCamera makeDefault position={[1.1, 0.85, 2.35]} fov={30} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 3, 2.5]} intensity={0.95} />
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.45} />
      </Suspense>
      <Suspense fallback={null}>
        <FitModel onFit={(height) => setMiddle(height / 2)}>
          <Model />
        </FitModel>
        <ContactShadows frames={1} scale={2.2} blur={2.4} far={1.2} opacity={0.35} />
      </Suspense>
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

// The shop: every product as a 3D model, plus the 3D logo lab.
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
        // Grouped by product type; most popular first within a type
        const list = [...res.data.products].sort((a, b) => TYPE_ORDER.indexOf(a.model3d) - TYPE_ORDER.indexOf(b.model3d));
        setProducts(list);
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

      <div className="lab-banner">
        <div>
          <strong>3D logo lab</strong>
          <span className="muted small">Place logos anywhere around a mug, change its colour and turn it in 3D.</span>
        </div>
        <Link to="/customize-3d" className="btn btn-secondary">Open the 3D logo lab</Link>
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
                  <ModelStage model={MODELS[product.model3d]} />
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
