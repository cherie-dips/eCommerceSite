import React, { Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, PerspectiveCamera, View } from "@react-three/drei";
import api from "../utils/api";
import { FitModel, PRODUCT_MODELS } from "../components/three/productModels";

// One product turning slowly in its card; drag to turn it yourself.
function ModelStage({ type }) {
  const Model = type.Model;
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

// "Design your own": choose a product to customise, or open the 3D logo lab.
export default function CustomizationPage() {
  const [products, setProducts] = useState({}); // model3d key -> product
  const [loading, setLoading] = useState(true);
  const pageRef = useRef(null);

  useEffect(() => {
    api
      .get("/products", { params: { customizable: "true", has3d: "true", sort: "popular", limit: 48 } })
      .then((res) => {
        const byModel = {};
        for (const p of res.data.products) byModel[p.model3d] ??= p; // most popular one per type
        setProducts(byModel);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page" ref={pageRef}>
      <div className="page-header">
        <div>
          <h1>Design your own</h1>
          <p>Pick a product, upload your logo or photo, and choose from instant design ideas.</p>
        </div>
        <Link to="/customize-3d" className="btn btn-secondary">Open the 3D logo lab</Link>
      </div>

      <div className="choose-grid">
        {PRODUCT_MODELS.map(({ key, name }, i) => {
          const product = products[key];
          return (
            <div key={key} className="choose-card">
              <View className="choose-stage" index={i + 1}>
                <ModelStage type={PRODUCT_MODELS[i]} />
              </View>
              <div className="choose-info">
                <strong>{product?.name || name}</strong>
                <span className="muted small">
                  {product ? `from ₹${product.price}${product.images?.back ? " · front & back" : ""}` : loading ? "Loading..." : "Coming soon"}
                </span>
              </div>
              {product ? (
                <Link to={`/products/${product._id}`} className="btn btn-primary btn-sm">Design this</Link>
              ) : (
                <button className="btn btn-secondary btn-sm" disabled>Design this</button>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted small choose-hint">Drag a product to turn it around.</p>

      {/* One shared 3D canvas draws every product into its card */}
      <Canvas className="choose-canvas" eventSource={pageRef} flat dpr={[1, 2]} style={{ position: "fixed", inset: 0, zIndex: 5 }}>
        <View.Port />
      </Canvas>
    </div>
  );
}
