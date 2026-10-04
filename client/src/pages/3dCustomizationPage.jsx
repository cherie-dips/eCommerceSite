// 3dCustomizationPage.jsx
// Product customization page using react-three-fiber + @react-three/drei
// - Upload a logo and click the product to place it (dragging only rotates the view)
// - Click a placed logo to select it, then click the product to move it there,
//   or use the sliders to resize / rotate it; remove it with the button or Delete/Backspace
// - Change the base color of the product
// - Add the finished design to the cart, or export it as JSON

import React, { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Decal, Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api, { errorMessage } from "../utils/api";
import { surfaceQuaternion, useModelMeshes } from "../components/three/modelUtils";
import "../styles/Customization3D.css";

// Sizes are in model units. The mug model is in metres (about 12 cm wide, 15 cm tall).
const DEFAULT_LOGO_SIZE = 0.04;
const MIN_LOGO_SIZE = 0.01;
const MAX_LOGO_SIZE = 0.1;
// How far (in pixels) the pointer may move and still count as a click rather than a drag.
const CLICK_MOVE_TOLERANCE = 4;
const Z_AXIS = new THREE.Vector3(0, 0, 1);

// Copies a canvas into a PNG no bigger than maxSize pixels (keeps the cart and uploads small).
function canvasToPng(source, maxSize = 1024) {
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const out = document.createElement("canvas");
  out.width = Math.round(source.width * scale);
  out.height = Math.round(source.height * scale);
  out.getContext("2d").drawImage(source, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

// ---------- LogoDecal: projects one logo onto the mesh it is placed inside ----------
function LogoDecal({ decal, isSelected }) {
  const texture = useTexture(decal.image);

  useLayoutEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const rotation = useMemo(() => {
    const q = new THREE.Quaternion()
      .fromArray(decal.quaternion)
      .multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, THREE.MathUtils.degToRad(decal.spin)));
    const euler = new THREE.Euler().setFromQuaternion(q);
    return [euler.x, euler.y, euler.z];
  }, [decal.quaternion, decal.spin]);

  return (
    <Decal
      position={decal.position}
      rotation={rotation}
      scale={[decal.size, decal.size, decal.size]}
      map={texture}
      depthTest
      polygonOffsetFactor={-10}
      userData={{ decalId: decal.id }}
      // Light blue tint shows which logo is selected
      material-color={isSelected ? "#bcd3ff" : "#ffffff"}
    />
  );
}

// ---------- ProductModel: draws the model's meshes with the logos attached to them ----------
function ProductModel({ modelPath, color, decals, selectedId, onSurfaceClick }) {
  // Draw each mesh ourselves (instead of the whole loaded scene) so logos can be placed
  // directly inside the mesh they belong to. A logo only shows up on its parent mesh.
  const meshes = useModelMeshes(modelPath, color);

  return meshes.map((m) => (
    <mesh
      key={m.key}
      geometry={m.geometry}
      material={m.material}
      position={m.position}
      quaternion={m.quaternion}
      scale={m.scale}
      castShadow
      receiveShadow
      onClick={(e) => onSurfaceClick(e, m.key)}
    >
      {decals
        .filter((d) => d.meshKey === m.key)
        .map((d) => (
          <Suspense key={d.id} fallback={null}>
            <LogoDecal decal={d} isSelected={d.id === selectedId} />
          </Suspense>
        ))}
    </mesh>
  ));
}

// ---------- Main Page Component ----------
export default function CustomizationPage3D() {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const glRef = useRef(null);
  const logoFiles = useRef(new Map()); // logo image (data URL) -> original file
  const [adding, setAdding] = useState(false);

  const [modelPath, setModelPath] = useState("/models/plain_mug.glb");
  const [baseColor, setBaseColor] = useState("#ffffff");
  const [uploadedImage, setUploadedImage] = useState(null); // data URL
  const [decals, setDecals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [lastExport, setLastExport] = useState(null);
  const [products, setProducts] = useState([]);
  const [orderProductId, setOrderProductId] = useState("");

  const productModels = useMemo(
    () => [
      { id: "mug", label: "Mug", path: "/models/plain_mug.glb" },
    ],
    []
  );

  const selectedDecal = decals.find((d) => d.id === selectedId) || null;

  // Products the design can be ordered as: the one in the link (?product=...), else a mug
  useEffect(() => {
    const wanted = searchParams.get("product");
    api
      .get("/products", { params: { customizable: "true", limit: 48 } })
      .then((res) => {
        const list = res.data.products;
        setProducts(list);
        const pick = list.find((p) => p._id === wanted) || list.find((p) => p.model3d === "mug") || list.find((p) => /mug/i.test(p.name)) || list[0];
        if (pick) setOrderProductId(pick._id);
      })
      .catch((err) => console.error("Error fetching products:", err));
  }, [searchParams]);

  // handle image upload -> produce data URL for use as texture
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      logoFiles.current.set(ev.target.result, file);
      setUploadedImage(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const updateSelected = (changes) => {
    setDecals((list) => list.map((d) => (d.id === selectedId ? { ...d, ...changes } : d)));
  };

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setDecals((list) => list.filter((d) => d.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // Delete or Backspace removes the selected logo (Mac keyboards send Backspace for "delete").
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
      if (selectedId) {
        e.preventDefault();
        removeSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeSelected]);

  // Click on the product: select a logo, move the selected logo, or place a new one.
  const handleSurfaceClick = (e, meshKey) => {
    e.stopPropagation();
    if (e.delta > CLICK_MOVE_TOLERANCE) return; // the user was dragging to rotate the view

    const mesh = e.eventObject;

    // Did the click land on a logo? Then select it.
    const logoMeshes = mesh.children.filter((child) => child.userData?.decalId);
    const logoHit = new THREE.Raycaster(e.ray.origin, e.ray.direction).intersectObjects(logoMeshes, false)[0];
    if (logoHit && logoHit.distance <= e.distance + 1e-4) {
      setSelectedId(logoHit.object.userData.decalId);
      return;
    }

    // Position and orientation in the mesh's own coordinates (what the logo projection uses).
    const position = mesh.worldToLocal(e.point.clone()).toArray();
    const normal = e.face.normal.clone();
    const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(
      mesh.getWorldQuaternion(new THREE.Quaternion()).invert()
    );
    const quaternion = surfaceQuaternion(normal, localUp).toArray();

    if (selectedId) {
      updateSelected({ meshKey, position, quaternion });
    } else if (uploadedImage) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setDecals((list) => [
        ...list,
        { id, image: uploadedImage, meshKey, position, quaternion, size: DEFAULT_LOGO_SIZE, spin: 0 },
      ]);
      setSelectedId(id);
    }
  };

  const designDetails = () => ({
    modelPath,
    baseColor,
    decals: decals.map((d) => ({
      id: d.id,
      image: d.image,
      meshKey: d.meshKey,
      position: d.position,
      quaternion: d.quaternion,
      size: d.size,
      spin: d.spin,
    })),
  });

  // Export decal metadata as JSON (data URLs + transforms)
  const handleExport = () => {
    const exportData = { ...designDetails(), exportedAt: new Date().toISOString() };
    setLastExport(exportData);

    // trigger download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddToCart = async () => {
    if (!decals.length) {
      toast.error("Place your logo on the product first.");
      return;
    }
    if (!user) {
      toast.info("Please log in to add customised products to your cart.");
      navigate("/login", { state: { from: location.pathname + location.search } });
      return;
    }
    const product = products.find((p) => p._id === orderProductId);
    if (!product || !glRef.current) return;

    setAdding(true);
    try {
      // Remove the selection tint, wait for the view to redraw, then take a picture of it.
      setSelectedId(null);
      await nextFrame();
      await nextFrame();
      const preview = canvasToPng(glRef.current.domElement);

      // Save the design on the server: the picture, the logo files and where each logo sits.
      const logos = [...new Set(decals.map((d) => d.image))];
      const form = new FormData();
      form.append("previews", await (await fetch(preview)).blob(), "3d-preview.png");
      for (const [i, image] of logos.entries()) {
        const file = logoFiles.current.get(image) || (await (await fetch(image)).blob());
        form.append("assets", file, file.name || `logo-${i}.png`);
      }
      form.append(
        "data",
        JSON.stringify({
          productId: product._id,
          mode: "3d",
          name: `${product.name} 3D design`,
          meta: { modelPath, baseColor },
          views: [
            {
              view: "3d",
              layers: decals.map(({ image, meshKey, position, quaternion, size, spin }) => ({
                src: `asset:${logos.indexOf(image)}`,
                meshKey,
                position,
                quaternion,
                size,
                spin,
              })),
            },
          ],
        })
      );
      const res = await api.post("/designs", form, { timeout: 120000 });
      addToCart(product, res.data);
      toast.success("Your design was added to the cart!");
    } catch (err) {
      toast.error(errorMessage(err, "Your design couldn't be saved. Please try again."));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="customization-3d-page">
      <div className="customization-3d-sidebar">
        <h2 className="customization-3d-title">Customize Product (3D)</h2>
        <p className="customization-3d-subtitle">
          Place your logo on the mug, adjust it, then add it to your cart.
        </p>

        <label className="customization-3d-section-label">Choose product</label>
        <select
          value={modelPath}
          onChange={(e) => setModelPath(e.target.value)}
          className="customization-3d-select"
        >
          {productModels.map((p) => (
            <option key={p.id} value={p.path}>
              {p.label}
            </option>
          ))}
        </select>

        <label className="customization-3d-section-label">Upload logo / image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="customization-3d-file-input"
        />
        <div className="customization-3d-hint">PNG with transparent background works best.</div>

        {uploadedImage && (
          <div className="customization-3d-logo-preview">
            <span className="customization-3d-section-label" style={{ marginBottom: 4 }}>
              Current logo preview
            </span>
            <img src={uploadedImage} alt="logo preview" />
          </div>
        )}

        <label className="customization-3d-section-label">Base color</label>
        <div className="customization-3d-color-wrapper">
          <input
            type="color"
            value={baseColor}
            onChange={(e) => setBaseColor(e.target.value)}
            className="customization-3d-color-input"
          />
          <span className="customization-3d-color-value">{baseColor.toUpperCase()}</span>
        </div>

        {selectedDecal && (
          <div className="customization-3d-selected">
            <span className="customization-3d-section-label">Selected logo</span>
            <div className="customization-3d-hint">Click anywhere on the mug to move it there.</div>

            <label className="customization-3d-range-label">
              Size: {(selectedDecal.size * 100).toFixed(1)} cm
              <input
                type="range"
                min={MIN_LOGO_SIZE}
                max={MAX_LOGO_SIZE}
                step={0.002}
                value={selectedDecal.size}
                onChange={(e) => updateSelected({ size: Number(e.target.value) })}
                className="customization-3d-range"
              />
            </label>

            <label className="customization-3d-range-label">
              Rotation: {selectedDecal.spin}°
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={selectedDecal.spin}
                onChange={(e) => updateSelected({ spin: Number(e.target.value) })}
                className="customization-3d-range"
              />
            </label>

            <div className="customization-3d-button-row">
              <button onClick={removeSelected} className="customization-3d-button-secondary">
                Remove logo
              </button>
              <button onClick={() => setSelectedId(null)} className="customization-3d-button-secondary">
                Done
              </button>
            </div>
          </div>
        )}

        <label className="customization-3d-section-label">Order this design as</label>
        {products.length > 0 ? (
          <>
            <select
              value={orderProductId}
              onChange={(e) => setOrderProductId(e.target.value)}
              className="customization-3d-select"
            >
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (₹{p.price})
                </option>
              ))}
            </select>
            <button onClick={handleAddToCart} className="customization-3d-button-primary" disabled={adding}>
              <span>{adding ? "Saving your design..." : "Add to cart"}</span>
            </button>
          </>
        ) : (
          <div className="customization-3d-hint">No products are available to order yet.</div>
        )}

        <div style={{ marginTop: 8 }}>
          <button onClick={handleExport} className="customization-3d-button-secondary">
            <span>Export design (JSON)</span>
          </button>
          <div className="customization-3d-hint">
            This file contains your logo positions and can be used later for production.
          </div>
        </div>

        <div className="customization-3d-notes">
          <h4 className="customization-3d-notes-title">How it works</h4>
          <ul className="customization-3d-notes-list">
            <li>Upload a logo, then click the mug to place it. Drag to turn the mug around.</li>
            <li>Click a placed logo to select it. Then click the mug to move it, or use the sliders to resize and rotate it.</li>
            <li>Remove the selected logo with the button or the Delete/Backspace key.</li>
            <li>Click Done (or the empty background) before placing another logo.</li>
            <li>
              For print-quality output, send the exported JSON + model to a server that bakes decals into
              the UV texture.
            </li>
          </ul>
        </div>

        {lastExport && (
          <div className="customization-3d-export-preview">
            <h4 className="customization-3d-export-preview-title">Last export (preview)</h4>
            <pre>{JSON.stringify(lastExport, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="customization-3d-canvas-wrapper">
        <div className="customization-3d-canvas-badge">Interactive 3D preview</div>
        <div className="customization-3d-canvas-inner">
          <Canvas
            shadows
            camera={{ position: [0.2, 0.18, 0.38], fov: 45, near: 0.01, far: 50 }}
            gl={{ preserveDrawingBuffer: true }} // needed to take a picture for the cart
            onCreated={({ gl }) => {
              glRef.current = gl;
            }}
            onPointerMissed={() => setSelectedId(null)}
            style={{ height: "100%", width: "100%" }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[2, 3, 2]} intensity={1} castShadow />
            <spotLight position={[-2, 3, 2]} angle={0.3} intensity={0.6} />

            <Suspense fallback={null}>
              <Environment preset="studio" />
            </Suspense>

            <Suspense fallback={null}>
              <ProductModel
                modelPath={modelPath}
                color={baseColor}
                decals={decals}
                selectedId={selectedId}
                onSurfaceClick={handleSurfaceClick}
              />
            </Suspense>

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <planeGeometry args={[4, 4]} />
              <meshStandardMaterial color="#efefef" />
            </mesh>

            <OrbitControls makeDefault target={[0, 0.075, 0]} minDistance={0.15} maxDistance={1.5} />
          </Canvas>
        </div>
      </div>
    </div>
  );
}

// ----------------- END -----------------

// Installation notes:
// npm i three @react-three/fiber @react-three/drei
// Put properly UV-unwrapped GLB models into public/models/ and add them to productModels above.

// Production baking / export:
// For manufacturing, do not rely solely on decal projection for final print. Instead send the exported JSON which contains
// decal image (data URL) and position/rotation/scale to a server. On the server use Blender or three.js headless to bake the decals
// to the model's UV atlas at high resolution (e.g. 2048×2048 or 4096×4096) and return the final printable PNG.

// Optional improvements:
// - Add snapping presets (front center, left chest, right chest, sleeve, handle of mug)
// - Accept SVG/text and render to texture with high DPI
// - Client-side compositing pipeline to preview baked texture at higher resolution
// - Material presets (matte/glossy/metallic) using PBR workflow
