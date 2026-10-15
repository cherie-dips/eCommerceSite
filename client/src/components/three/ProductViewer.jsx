// A product's 3D model with designs on it.
// - Design studio: customers see their front/back designs on the product.
// - Product form: sellers click the model to choose where designs are printed.
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import ProductModel, { FitModel, ModelErrorBoundary } from "./ProductModel";
import { buildDecalGeometry, DEFAULT_SPOT_SIZE, resolveSpot, spotFromClick } from "./printSpots";

const SIDES = ["front", "back"];
const NONE = {};

// Loads a picture as a texture and frees the previous one (designs change often while editing).
function useImageTexture(url) {
  const [texture, setTexture] = useState(null);
  useEffect(() => {
    if (!url) {
      setTexture(null);
      return undefined;
    }
    let cancelled = false;
    let loaded = null;
    new THREE.TextureLoader().load(url, (t) => {
      if (cancelled) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      loaded = t;
      setTexture(t);
    });
    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, [url]);
  return texture;
}

// A dashed "design goes here" box for sellers placing print spots.
function placeholderImage(label, aspect) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = Math.max(64, Math.round(512 * aspect));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(124, 0, 52, 0.14)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setLineDash([22, 14]);
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#7c0034";
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  ctx.fillStyle = "#7c0034";
  ctx.font = "bold 54px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

function SideDesign({ modelRef, side, spot, image }) {
  const texture = useImageTexture(image);
  const geometry = useMemo(() => {
    if (!texture || !modelRef.current) return null;
    const target = resolveSpot(modelRef.current, side, spot);
    return target ? buildDecalGeometry(target, texture.image.height / texture.image.width) : null;
  }, [texture, modelRef, side, spot]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} renderOrder={1}>
      <meshStandardMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} roughness={0.6} />
    </mesh>
  );
}

function Scene({ product, designs, spots, placeholders, editSide, onPlace, onFit }) {
  const modelRef = useRef(null);
  const [fitted, setFitted] = useState(false);
  // Rebuilt only when the sides or their shapes change, not on every render
  const placeholderKey = Object.entries(placeholders).map(([side, aspect]) => `${side}:${aspect.toFixed(3)}`).join(",");
  const placeholderImages = useMemo(
    () => Object.fromEntries(Object.entries(placeholders).map(([side, aspect]) => [side, placeholderImage(side === "back" ? "Back design" : "Front design", aspect)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeholderKey]
  );

  const place = (event) => {
    // A drag turns the model; only a real click places the design
    if (!editSide || event.delta > 4) return;
    event.stopPropagation();
    onPlace(editSide, spotFromClick(modelRef.current, event, spots[editSide]?.size ?? DEFAULT_SPOT_SIZE));
  };

  return (
    <>
      <FitModel
        onFit={(height) => {
          onFit(height);
          setFitted(true);
        }}
      >
        <group ref={modelRef} onClick={editSide ? place : undefined}>
          <ProductModel product={product} />
        </group>
      </FitModel>
      <ContactShadows frames={1} scale={2.2} blur={2.4} far={1.2} opacity={0.35} />
      {fitted &&
        SIDES.map((side) => {
          const image = designs[side] || placeholderImages[side];
          return image ? <SideDesign key={side} modelRef={modelRef} side={side} spot={spots[side]} image={image} /> : null;
        })}
    </>
  );
}

// product:      { modelFile, model3d, modelPrintSpots }
// designs:      { front, back } picture URLs of the customer's designs
// spots:        print spots to use instead of the product's saved ones (product form)
// placeholders: { front, back } aspect ratios for "design goes here" boxes (product form)
// editSide:     "front" | "back" while a seller is placing that side; clicks call onPlace(side, spot)
export default function ProductViewer({ product, designs = NONE, spots, placeholders = NONE, editSide = null, onPlace, height = 420 }) {
  const [middle, setMiddle] = useState(0.5);
  const [failed, setFailed] = useState(false);
  const modelKey = product.modelFile || product.model3d;
  useEffect(() => setFailed(false), [modelKey]);

  return (
    <div className="product-viewer" style={{ height }}>
      <Canvas flat dpr={[1, 2]} camera={{ position: [0.7, 0.8, 2.4], fov: 30 }}>
        <ambientLight intensity={0.25} />
        <directionalLight position={[2, 3, 2.5]} intensity={0.95} />
        <Suspense fallback={null}>
          <Environment preset="studio" environmentIntensity={0.45} />
        </Suspense>
        <ModelErrorBoundary key={modelKey} onError={() => setFailed(true)}>
          <Suspense fallback={null}>
            <Scene
              product={product}
              designs={designs}
              spots={spots ?? product.modelPrintSpots ?? NONE}
              placeholders={placeholders}
              editSide={editSide}
              onPlace={onPlace}
              onFit={(h) => setMiddle(h / 2)}
            />
          </Suspense>
        </ModelErrorBoundary>
        <OrbitControls makeDefault target={[0, middle, 0]} enablePan={false} minDistance={1.2} maxDistance={4} />
      </Canvas>
      {failed && <div className="product-viewer-message">This 3D model couldn't be shown.</div>}
    </div>
  );
}
