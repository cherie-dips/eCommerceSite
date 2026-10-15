// 3D models of the products customers can design (shown on the "Design your own" page).
// The mug is a real model file; the others are built from simple shapes so they load instantly.
// Sizes are in metres (roughly the real product), facing the camera along +Z with Y up.
import { useLayoutEffect, useMemo, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { MODEL_PATHS, useModelMeshes } from "./modelUtils";
import { PRODUCT_TYPES } from "./productTypes";

const fabric = (color) => ({ color, roughness: 0.92, metalness: 0 });

// ---------- Mug (model file) ----------
function MugModel() {
  const meshes = useModelMeshes(MODEL_PATHS.mug, "#ffffff");
  return meshes.map((m) => (
    <mesh key={m.key} geometry={m.geometry} material={m.material} position={m.position} quaternion={m.quaternion} scale={m.scale} castShadow />
  ));
}

// ---------- T-shirt: a soft, puffy shirt outline ----------
const NECK = { left: -0.085, right: 0.085, top: 0.29, front: 0.19, back: 0.255 };

function TShirtModel({ color = "#f2f2ef" }) {
  const { body, neckInside, collar } = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.23, -0.36);
    s.quadraticCurveTo(0, -0.375, 0.23, -0.36);
    s.lineTo(0.235, 0.09);
    s.lineTo(0.37, 0.015);
    s.lineTo(0.425, 0.13);
    s.quadraticCurveTo(0.3, 0.235, 0.165, 0.27);
    s.lineTo(NECK.right, NECK.top);
    s.quadraticCurveTo(0, NECK.front, NECK.left, NECK.top);
    s.lineTo(-0.165, 0.27);
    s.quadraticCurveTo(-0.3, 0.235, -0.425, 0.13);
    s.lineTo(-0.37, 0.015);
    s.lineTo(-0.235, 0.09);
    s.closePath();
    const body = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.026, bevelSize: 0.018, bevelSegments: 6, curveSegments: 32 });
    body.translate(0, 0, -0.03);

    // The inside of the back, seen through the neck opening
    const n = new THREE.Shape();
    n.moveTo(NECK.right, NECK.top);
    n.quadraticCurveTo(0, NECK.front, NECK.left, NECK.top);
    n.quadraticCurveTo(0, NECK.back, NECK.right, NECK.top);
    const neckInside = new THREE.ExtrudeGeometry(n, { depth: 0.01, bevelEnabled: false, curveSegments: 24 });
    neckInside.translate(0, 0, -0.04);

    const front = 0.03 + 0.026;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(NECK.right + 0.004, NECK.top + 0.004, front - 0.008),
      new THREE.Vector3(0, NECK.front - 0.006, front + 0.002),
      new THREE.Vector3(NECK.left - 0.004, NECK.top + 0.004, front - 0.008)
    );
    const collar = new THREE.TubeGeometry(curve, 40, 0.011, 10, false);
    return { body, neckInside, collar };
  }, []);

  return (
    <group>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial {...fabric(color)} />
      </mesh>
      <mesh geometry={neckInside}>
        <meshStandardMaterial {...fabric("#d9d9d6")} />
      </mesh>
      <mesh geometry={collar} castShadow>
        <meshStandardMaterial {...fabric("#ececea")} />
      </mesh>
    </group>
  );
}

// ---------- Tote bag: canvas body with two strap handles ----------
function ToteModel({ color = "#e4dac4" }) {
  const { body, handle, front } = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.19, -0.21);
    s.lineTo(0.19, -0.21);
    s.lineTo(0.19, 0.21);
    s.lineTo(-0.19, 0.21);
    s.closePath();
    const depth = 0.03;
    const bevel = 0.012;
    const body = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.006, bevelSegments: 4 });
    body.translate(0, 0, -depth / 2);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.09, 0.12, 0),
      new THREE.Vector3(-0.095, 0.25, 0),
      new THREE.Vector3(-0.075, 0.37, 0),
      new THREE.Vector3(0, 0.42, 0),
      new THREE.Vector3(0.075, 0.37, 0),
      new THREE.Vector3(0.095, 0.25, 0),
      new THREE.Vector3(0.09, 0.12, 0),
    ]);
    const handle = new THREE.TubeGeometry(curve, 64, 0.013, 10, false);
    return { body, handle, front: depth / 2 + bevel };
  }, []);

  return (
    <group>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial {...fabric(color)} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} geometry={handle} position={[0, 0, side * (front + 0.003)]} scale={[1, 1, 0.3]} castShadow>
          <meshStandardMaterial {...fabric("#d2c6aa")} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Notebook: kraft hardcover with pages and an elastic band ----------
function NotebookModel({ color = "#c9a878" }) {
  const w = 0.148;
  const h = 0.21;
  const pages = 0.013;
  const board = 0.0025;
  return (
    <group>
      <mesh position={[0.002, 0, 0]} castShadow>
        <boxGeometry args={[w - 0.006, h - 0.008, pages]} />
        <meshStandardMaterial color="#f4f0e6" roughness={0.95} />
      </mesh>
      {[1, -1].map((side) => (
        <RoundedBox key={side} args={[w, h, board]} radius={0.001} smoothness={3} position={[0, 0, side * (pages / 2 + board / 2)]} castShadow>
          <meshStandardMaterial color={color} roughness={0.85} />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.005, h, pages + board * 2]} radius={0.0015} smoothness={3} position={[-w / 2 + 0.0025, 0, 0]}>
        <meshStandardMaterial color={color} roughness={0.85} />
      </RoundedBox>
      <mesh position={[w / 2 - 0.018, 0, 0]}>
        <boxGeometry args={[0.006, h + 0.002, pages + board * 2 + 0.002]} />
        <meshStandardMaterial color="#3a2e24" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ---------- Cap: rounded crown, curved brim and a top button ----------
function CapModel({ color = "#23324f" }) {
  const { crown, brim } = useMemo(() => {
    const crown = new THREE.SphereGeometry(0.1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const s = new THREE.Shape();
    s.absellipse(0, 0, 0.1, 0.19, 0, Math.PI, false);
    s.absellipse(0, 0, 0.088, 0.095, Math.PI, 0, true);
    const brim = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 48 });
    return { crown, brim };
  }, []);
  return (
    <group>
      <mesh geometry={crown} scale={[1, 0.88, 1.1]} castShadow>
        <meshStandardMaterial {...fabric(color)} />
      </mesh>
      {/* Dark inside, seen under the brim */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.1, 1]}>
        <circleGeometry args={[0.1, 48]} />
        <meshStandardMaterial color="#141b2b" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={brim} position={[0, 0.002, 0]} rotation={[Math.PI / 2 + 0.1, 0, 0]} castShadow>
        <meshStandardMaterial {...fabric(color)} />
      </mesh>
      <mesh position={[0, 0.088, 0]}>
        <sphereGeometry args={[0.008, 16, 12]} />
        <meshStandardMaterial {...fabric(color)} />
      </mesh>
    </group>
  );
}

// ---------- Water bottle: steel body with a loop cap ----------
function BottleModel({ color = "#d7dce3" }) {
  const body = useMemo(() => {
    const profile = [
      [0, 0], [0.032, 0], [0.036, 0.004], [0.036, 0.17], [0.034, 0.186], [0.027, 0.199], [0.021, 0.207], [0.021, 0.216],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(profile, 64);
  }, []);
  return (
    <group>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.229, 0]} castShadow>
        <cylinderGeometry args={[0.023, 0.023, 0.028, 48]} />
        <meshStandardMaterial color="#232323" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <torusGeometry args={[0.012, 0.0035, 12, 32]} />
        <meshStandardMaterial color="#232323" roughness={0.55} />
      </mesh>
    </group>
  );
}

// ---------- Phone case: the printable back faces the camera ----------
function PhoneCaseModel({ color = "#f3f3f1" }) {
  const t = 0.011;
  return (
    <group>
      <RoundedBox args={[0.077, 0.158, t]} radius={0.0045} smoothness={4} castShadow>
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.07, 0.151, 0.001]} radius={0.0004} position={[0, 0, -t / 2 - 0.0002]}>
        <meshStandardMaterial color="#111111" roughness={0.2} />
      </RoundedBox>
      <RoundedBox args={[0.033, 0.033, 0.003]} radius={0.001} position={[-0.017, 0.054, t / 2 + 0.001]}>
        <meshStandardMaterial color="#2b2b2b" roughness={0.4} />
      </RoundedBox>
      {[[-0.024, 0.061], [-0.024, 0.047], [-0.01, 0.054]].map(([x, y]) => (
        <mesh key={`${x}${y}`} position={[x, y, t / 2 + 0.003]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0048, 0.0048, 0.002, 24]} />
          <meshStandardMaterial color="#0b0b0b" metalness={0.5} roughness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Mouse pad: leaning back so its printed top is visible ----------
function MousePadModel({ color = "#2b2d33" }) {
  return (
    <group rotation={[-0.45, 0, 0]}>
      <RoundedBox args={[0.25, 0.21, 0.004]} radius={0.0019} smoothness={3} castShadow>
        <meshStandardMaterial color={color} roughness={0.95} />
      </RoundedBox>
    </group>
  );
}

const MODELS = {
  tshirt: TShirtModel,
  mug: MugModel,
  tote: ToteModel,
  notebook: NotebookModel,
  cap: CapModel,
  bottle: BottleModel,
  phonecase: PhoneCaseModel,
  mousepad: MousePadModel,
};

// Every product type with its 3D model, in the order shown on the page.
export const PRODUCT_MODELS = PRODUCT_TYPES.map((t) => ({ ...t, Model: MODELS[t.key] }));

// Scales any model to fit in a 1-unit box, standing on y = 0 and centred on the y axis.
// Reports the fitted height so the camera can aim at the middle of the product.
export function FitModel({ onFit, children }) {
  const outer = useRef(null);
  const inner = useRef(null);
  useLayoutEffect(() => {
    outer.current.scale.setScalar(1);
    inner.current.position.set(0, 0, 0);
    outer.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(inner.current);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1 / Math.max(size.x, size.y, size.z);
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
