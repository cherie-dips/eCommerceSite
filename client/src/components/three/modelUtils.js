// Shared 3D helpers for the 3D customizer and the mug preview in the design studio.
import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export const MODEL_PATHS = { mug: "/models/plain_mug.glb" };

// Orientation for a picture lying on a surface: it faces out along the surface normal and
// the top of the picture points "up" as much as the surface allows (so it isn't sideways).
export function surfaceQuaternion(normal, up) {
  const z = normal.clone().normalize();
  let y = up.clone().sub(z.clone().multiplyScalar(up.dot(z)));
  if (y.lengthSq() < 1e-6) {
    // Straight on the top or bottom: any direction along the surface will do.
    const helper = Math.abs(z.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    y = helper.sub(z.clone().multiplyScalar(helper.dot(z)));
  }
  y.normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// Loads a model and lists its meshes with their full position, so each mesh can be drawn
// on its own (pictures can then be attached directly to the mesh they belong to).
export function useModelMeshes(modelPath, color) {
  const { scene } = useGLTF(modelPath, true);
  const meshes = useMemo(() => {
    scene.updateMatrixWorld(true);
    const list = [];
    scene.traverse((child) => {
      if (!child.isMesh) return;
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      child.matrixWorld.decompose(position, quaternion, scale);
      list.push({
        key: `${list.length}-${child.name}`,
        geometry: child.geometry,
        // Own copy so changing the colour doesn't affect the cached model
        material: child.material.clone(),
        position,
        quaternion,
        scale,
      });
    });
    return list;
  }, [scene]);

  useEffect(() => {
    if (color) meshes.forEach((m) => m.material.color?.set(color));
  }, [meshes, color]);

  return meshes;
}
