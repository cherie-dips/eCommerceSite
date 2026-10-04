// Drawing designs. The editor (react-konva) and the exported pictures (previews,
// print files, suggestion thumbnails) all use layerProps(), so what you see in the
// editor is exactly what gets printed.
import Konva from "konva";
import { DESIGN_WIDTH } from "./designUtils";

// Key used to find a layer's loaded picture: uploaded-but-not-saved images use their
// local asset id, images from a saved design use their server path.
export const imageKey = (layer) => (layer.assetId ? `asset:${layer.assetId}` : `src:${layer.src}`);

// Konva settings for one layer. `image` is the loaded <img> for image layers.
export function layerProps(layer, image) {
  const w = layer.width;
  const h = layer.height;
  const common = {
    id: layer.id,
    x: layer.x,
    y: layer.y,
    rotation: layer.rotation || 0,
    opacity: layer.opacity ?? 1,
  };

  if (layer.type === "image") {
    const props = { ...common, image, width: w, height: h, offsetX: w / 2, offsetY: h / 2, scaleX: layer.flipX ? -1 : 1, scaleY: 1 };
    if (image) {
      const nw = image.naturalWidth;
      const nh = image.naturalHeight;
      if (layer.frame === "circle") {
        const s = Math.min(nw, nh);
        props.crop = { x: (nw - s) / 2, y: (nh - s) / 2, width: s, height: s };
        props.cornerRadius = w / 2;
      } else {
        props.crop = { x: 0, y: 0, width: nw, height: nh };
        props.cornerRadius = layer.frame === "rounded" ? Math.min(w, h) * 0.08 : 0;
      }
    }
    return props;
  }

  if (layer.type === "text") {
    return {
      ...common,
      text: layer.text || " ",
      fontFamily: layer.fontFamily || "Inter",
      fontSize: layer.fontSize || 60,
      fontStyle: layer.fontStyle || "normal",
      fill: layer.fill || "#111111",
      align: layer.align || "center",
      width: w,
      offsetX: w / 2,
      letterSpacing: layer.letterSpacing || 0,
      lineHeight: layer.lineHeight || 1.1,
      stroke: layer.stroke || undefined,
      strokeWidth: layer.stroke ? layer.strokeWidth || 0 : 0,
      fillAfterStrokeEnabled: true,
      textDecoration: layer.textDecoration || "",
      wrap: "word",
      scaleX: 1,
      scaleY: 1,
    };
  }

  const shape = {
    ...common,
    fill: layer.fill,
    stroke: layer.stroke || undefined,
    strokeWidth: layer.stroke ? layer.strokeWidth || 0 : 0,
    scaleX: 1,
    scaleY: 1,
  };
  if (layer.type === "ellipse") return { ...shape, radiusX: w / 2, radiusY: h / 2 };
  return { ...shape, width: w, height: h, offsetX: w / 2, offsetY: h / 2, cornerRadius: Math.min(layer.cornerRadius || 0, w / 2, h / 2) };
}

// Builds one Konva shape for a layer (used for exported pictures).
export function buildLayerNode(layer, images) {
  const image = layer.type === "image" ? images.get(imageKey(layer)) : null;
  if (layer.type === "image" && !image) return null;
  const props = layerProps(layer, image);
  let node;
  if (layer.type === "image") node = new Konva.Image(props);
  else if (layer.type === "text") node = new Konva.Text(props);
  else if (layer.type === "ellipse") node = new Konva.Ellipse(props);
  else node = new Konva.Rect(props);
  // Text is positioned by its centre, which needs its height first.
  if (layer.type === "text") node.offsetY(node.height() / 2);
  return node;
}

function buildDesignGroup(layers, images, H) {
  const group = new Konva.Group({ clipX: 0, clipY: 0, clipWidth: DESIGN_WIDTH, clipHeight: H });
  for (const layer of layers) {
    if (layer.hidden) continue;
    const node = buildLayerNode(layer, images);
    if (node) group.add(node);
  }
  return group;
}

function withStage(width, height, draw) {
  const stage = new Konva.Stage({ container: document.createElement("div"), width, height });
  const layer = new Konva.Layer();
  stage.add(layer);
  try {
    draw(layer);
    layer.draw();
    return stage;
  } catch (err) {
    stage.destroy();
    throw err;
  }
}

// The print-ready file: only the design, transparent background, high resolution.
export function renderPrintFile({ layers, images, H, pixelWidth }) {
  const stage = withStage(DESIGN_WIDTH, H, (layer) => layer.add(buildDesignGroup(layers, images, H)));
  try {
    return stage.toDataURL({ pixelRatio: pixelWidth / DESIGN_WIDTH, mimeType: "image/png" });
  } finally {
    stage.destroy();
  }
}

// A picture of the product with the design on it.
// focus: zoom in on the print area (used for the small suggestion pictures).
// If the product photo can't be used (it comes from another website), the design is
// drawn on a plain background instead.
export function renderPreview({ mockup, area, layers, images, H, width = 1000, focus = false, mimeType = "image/jpeg", quality = 0.9 }) {
  const draw = (useMockup) => {
    // Height/width of the product photo (worked out from the print area when there's no photo)
    const aspect = useMockup && mockup ? mockup.naturalHeight / mockup.naturalWidth : (area.width * H) / (area.height * DESIGN_WIDTH) || 1;
    const baseW = width;
    const baseH = width * aspect;
    // Part of the photo to show
    let view = { x: 0, y: 0, w: baseW, h: baseH };
    if (focus) {
      const aw = area.width * baseW;
      const ah = area.height * baseH;
      const size = Math.min(Math.max(aw, ah) * 1.35, baseW, baseH);
      view = {
        x: Math.min(Math.max(0, area.x * baseW + aw / 2 - size / 2), baseW - size),
        y: Math.min(Math.max(0, area.y * baseH + ah / 2 - size / 2), baseH - size),
        w: size,
        h: size,
      };
    }
    const outW = width;
    const outH = Math.round((width * view.h) / view.w);
    const k = outW / view.w;

    const stage = withStage(outW, outH, (layer) => {
      if (useMockup && mockup) layer.add(new Konva.Image({ image: mockup, x: -view.x * k, y: -view.y * k, width: baseW * k, height: baseH * k }));
      else layer.add(new Konva.Rect({ width: outW, height: outH, fill: "#f4f4f6" }));
      const group = buildDesignGroup(layers, images, H);
      group.position({ x: (area.x * baseW - view.x) * k, y: (area.y * baseH - view.y) * k });
      const scale = (area.width * baseW * k) / DESIGN_WIDTH;
      group.scale({ x: scale, y: scale });
      layer.add(group);
    });
    try {
      return stage.toDataURL({ mimeType, quality, pixelRatio: 1 });
    } finally {
      stage.destroy();
    }
  };
  try {
    return draw(true);
  } catch {
    return draw(false);
  }
}
