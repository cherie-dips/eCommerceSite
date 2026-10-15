// A grid of products shown as 3D models that turn slowly (drag to turn one yourself).
// One shared WebGL canvas draws every card. Products without a model show their photo.
import { Suspense, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, PerspectiveCamera, View } from "@react-three/drei";
import { PiArrowRight, PiHeart, PiHeartFill } from "react-icons/pi";
import { assetUrl } from "../utils/api";
import { useLikes } from "../context/LikesContext";
import Stars from "./Stars";
import ProductModel, { FitModel, ModelErrorBoundary } from "./three/ProductModel";

const hasModel = (product) => Boolean(product.modelFile || product.model3d);

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

export default function ProductGallery({ products }) {
  const { likedItems, toggleLike } = useLikes();
  const gridRef = useRef(null);

  return (
    <div ref={gridRef}>
      <div className="gallery-grid">
        {products.map((product, i) => {
          const liked = likedItems.some((item) => item._id === product._id);
          const href = `/products/${product._id}`;
          return (
            <article key={product._id} className="gallery-card">
              {hasModel(product) ? (
                <View className="gallery-stage" index={i + 1}>
                  <ModelStage product={product} />
                </View>
              ) : (
                <img className="gallery-photo" src={assetUrl(product.image)} alt="" loading="lazy" />
              )}
              {product.category && <span className="gallery-tag">{product.category}</span>}
              <button
                className={`icon-button gallery-like ${liked ? "liked" : ""}`}
                onClick={() => toggleLike(product)}
                aria-label={liked ? `Unlike ${product.name}` : `Like ${product.name}`}
              >
                {liked ? <PiHeartFill /> : <PiHeart />}
              </button>
              <div className="gallery-info">
                <div>
                  <Link to={href} className="gallery-name">{product.name}</Link>
                  {product.ratingCount > 0 ? (
                    <Stars value={product.ratingAvg} size="0.8rem" />
                  ) : (
                    <span className="gallery-meta">{product.images?.back ? "Front & back print" : "Front print"}</span>
                  )}
                </div>
                <span className="gallery-price">₹{product.price}</span>
              </div>
              <div className="gallery-actions">
                <Link to={href} className="btn btn-secondary btn-sm">
                  {product.customizable === false ? "View" : "Customise"} <PiArrowRight className="arrow" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {/* One shared 3D canvas draws every product into its card */}
      {products.some(hasModel) && (
        <Canvas eventSource={gridRef} flat dpr={[1, 2]} style={{ position: "fixed", inset: 0, zIndex: 5 }}>
          <View.Port />
        </Canvas>
      )}
    </div>
  );
}
