// 3D preview of the front design on a mug (shown in the design studio).
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Decal, Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { MODEL_PATHS, surfaceQuaternion, useModelMeshes } from "../components/three/modelUtils";

function DesignDecal({ textureUrl, placement, widthM, heightM }) {
  const texture = useTexture(textureUrl);
  useLayoutEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);
  return (
    <Decal
      position={placement.position}
      rotation={placement.rotation}
      scale={[widthM, heightM, Math.max(widthM, heightM) * 0.6]}
      map={texture}
      depthTest
      polygonOffsetFactor={-10}
    />
  );
}

function Mug({ textureUrl, widthM, heightM }) {
  const meshes = useModelMeshes(MODEL_PATHS.mug, "#ffffff");
  const meshRefs = useRef([]);
  const [placement, setPlacement] = useState(null);

  // Find the front of the mug by looking at it straight from the front.
  useLayoutEffect(() => {
    const targets = meshRefs.current.filter(Boolean);
    if (!targets.length) return;
    targets.forEach((m) => m.updateMatrixWorld(true));
    const box = new THREE.Box3();
    targets.forEach((m) => box.expandByObject(m));
    const center = box.getCenter(new THREE.Vector3());
    const ray = new THREE.Raycaster(new THREE.Vector3(center.x, center.y, box.max.z + 1), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObjects(targets, false)[0];
    if (!hit) return;
    const mesh = hit.object;
    const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()).invert());
    const q = surfaceQuaternion(hit.face.normal.clone(), localUp);
    const e = new THREE.Euler().setFromQuaternion(q);
    setPlacement({
      meshIndex: targets.indexOf(mesh),
      position: mesh.worldToLocal(hit.point.clone()).toArray(),
      rotation: [e.x, e.y, e.z],
    });
  }, [meshes]);

  return meshes.map((m, i) => (
    <mesh
      key={m.key}
      ref={(node) => (meshRefs.current[i] = node)}
      geometry={m.geometry}
      material={m.material}
      position={m.position}
      quaternion={m.quaternion}
      scale={m.scale}
      castShadow
      receiveShadow
    >
      {placement && placement.meshIndex === i && textureUrl && (
        <Suspense fallback={null}>
          <DesignDecal textureUrl={textureUrl} placement={placement} widthM={widthM} heightM={heightM} />
        </Suspense>
      )}
    </mesh>
  ));
}

export default function Mug3DPreview({ textureUrl, widthCm, heightCm }) {
  const widthM = useMemo(() => widthCm / 100, [widthCm]);
  const heightM = useMemo(() => heightCm / 100, [heightCm]);
  return (
    <Canvas shadows camera={{ position: [0.14, 0.24, 0.4], fov: 40, near: 0.01, far: 50 }} style={{ width: "100%", height: "100%" }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={1} castShadow />
      <Suspense fallback={null}>
        <Environment preset="studio" />
      </Suspense>
      <Suspense fallback={null}>
        <Mug textureUrl={textureUrl} widthM={widthM} heightM={heightM} />
      </Suspense>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#efefef" />
      </mesh>
      <OrbitControls makeDefault target={[0, 0.075, 0]} minDistance={0.15} maxDistance={1.2} />
    </Canvas>
  );
}
