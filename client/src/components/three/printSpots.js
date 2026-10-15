// Putting a design onto a product's 3D model.
//
// A print spot (Product.modelPrintSpots) is stored in the model's own coordinates:
//   { point: [x, y, z], normal: [x, y, z], size }   size = design width / model width
// so it stays right however big the model is drawn. Without a spot, a side's design goes
// in the middle of that side.
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

const UP = new THREE.Vector3(0, 1, 0);
export const DEFAULT_SPOT_SIZE = 0.45;

const round = (v) => v.toArray().map((n) => Math.round(n * 1e5) / 1e5);

// Orientation for a picture lying on a surface: it faces out along the surface normal and
// its top points "up" as much as the surface allows (so it isn't sideways).
function surfaceQuaternion(normal) {
  const z = normal.clone().normalize();
  let y = UP.clone().sub(z.clone().multiplyScalar(UP.dot(z)));
  if (y.lengthSq() < 1e-6) {
    // Straight on the top or bottom: any direction along the surface will do
    const helper = Math.abs(z.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    y = helper.sub(z.clone().multiplyScalar(helper.dot(z)));
  }
  y.normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

const meshesOf = (root) => {
  const meshes = [];
  root.traverse((o) => o.isMesh && o.visible && meshes.push(o));
  return meshes;
};

// Surface direction of a raycast hit in world space, pointing back towards the ray's start
// (some models have flipped faces).
function hitNormal(hit, rayDirection) {
  const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : rayDirection.clone().negate();
  return normal.dot(rayDirection) > 0 ? normal.negate() : normal;
}

// Where a side's design goes, in world space: { mesh, point, normal, width }, or null when
// the model has no surface there.
export function resolveSpot(model, side, spot) {
  model.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const ray = new THREE.Raycaster();

  if (spot) {
    const point = model.localToWorld(new THREE.Vector3(...spot.point));
    const normal = new THREE.Vector3(...spot.normal).transformDirection(model.matrixWorld);
    // Look at the spot from just outside the surface
    ray.set(point.clone().addScaledVector(normal, size.length() * 0.02), normal.clone().negate());
  } else {
    const back = side === "back";
    ray.set(new THREE.Vector3(center.x, center.y, back ? box.min.z - 1 : box.max.z + 1), new THREE.Vector3(0, 0, back ? 1 : -1));
  }

  const hit = ray.intersectObjects(meshesOf(model), false)[0];
  if (!hit) return null;
  return {
    mesh: hit.object,
    point: hit.point,
    normal: hitNormal(hit, ray.ray.direction),
    width: (spot?.size ?? DEFAULT_SPOT_SIZE) * size.x,
  };
}

// The spot (model coordinates) for a click on the model, from a react-three-fiber event.
export function spotFromClick(model, event, size) {
  const normal = hitNormal(event, event.ray.direction);
  const toModel = model.matrixWorld.clone().invert();
  return {
    point: round(model.worldToLocal(event.point.clone())),
    normal: round(normal.transformDirection(toModel)),
    size,
  };
}

// Geometry that shows a design on the model at `target` (from resolveSpot). The design is
// projected onto the surface; `aspect` is its height / width.
export function buildDecalGeometry(target, aspect) {
  const { mesh, point, normal, width } = target;
  const height = width * aspect;
  const orientation = new THREE.Euler().setFromQuaternion(surfaceQuaternion(normal));
  const projected = new DecalGeometry(mesh, point, orientation, new THREE.Vector3(width, height, Math.max(width, height)));
  return keepFacing(projected, normal);
}

// Drops the parts of a projected design that face away from it, so it doesn't also show
// through on the other side of thin products (a phone case, a tote bag).
function keepFacing(geometry, direction) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  if (!normal) {
    geometry.computeVertexNormals();
    return geometry;
  }
  const kept = { position: [], normal: [], uv: [] };
  const faceNormal = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 3) {
    faceNormal.set(0, 0, 0);
    for (let k = 0; k < 3; k++) faceNormal.add(v.fromBufferAttribute(normal, i + k));
    if (faceNormal.normalize().dot(direction) < 0.1) continue;
    for (let k = i; k < i + 3; k++) {
      kept.position.push(position.getX(k), position.getY(k), position.getZ(k));
      kept.normal.push(normal.getX(k), normal.getY(k), normal.getZ(k));
      kept.uv.push(uv.getX(k), uv.getY(k));
    }
  }
  geometry.dispose();
  const result = new THREE.BufferGeometry();
  result.setAttribute("position", new THREE.Float32BufferAttribute(kept.position, 3));
  result.setAttribute("normal", new THREE.Float32BufferAttribute(kept.normal, 3));
  result.setAttribute("uv", new THREE.Float32BufferAttribute(kept.uv, 2));
  return result;
}
