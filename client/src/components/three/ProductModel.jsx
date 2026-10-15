// A product's 3D model: the .glb file its seller uploaded, or a built-in model (demo
// products only). Also: fitting any model into view, and surviving files that fail to load.
import { Component, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { assetUrl } from "../../utils/api";
import { BUILT_IN_MODELS } from "./builtInModels";

function UploadedModel({ url }) {
  const { scene } = useGLTF(url);
  // Each viewer gets its own copy: one object can only be in one scene at a time
  const copy = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={copy} />;
}

export default function ProductModel({ product }) {
  if (product.modelFile) return <UploadedModel url={assetUrl(product.modelFile)} />;
  const builtIn = BUILT_IN_MODELS[product.model3d];
  return builtIn ? <builtIn.Model /> : null;
}

// Scales any model to fit in a 1-unit box, standing on y = 0 and centred on the y axis,
// whatever units it was made in. Reports the fitted height so the camera can aim at the
// middle of the product.
export function FitModel({ onFit, children }) {
  const outer = useRef(null);
  const inner = useRef(null);
  useLayoutEffect(() => {
    outer.current.scale.setScalar(1);
    inner.current.position.set(0, 0, 0);
    outer.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(inner.current);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1 / Math.max(size.x, size.y, size.z, 1e-6);
    inner.current.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    outer.current.scale.setScalar(scale);
    onFit?.(size.y * scale);
    // Measured once when the model appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  );
}

// Shows nothing (instead of breaking the page) when a model file can't be loaded or read.
export class ModelErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("3D model couldn't be shown:", error);
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
