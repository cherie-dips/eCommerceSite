// Shared numbers and helpers for the design editor.
//
// A design is drawn inside the product's print area. Inside the editor, the print area
// is always 1000 "units" wide; its height (H) follows the print area's real shape.
// Every layer stores x/y as the CENTER of the layer, in these units.
import { assetUrl } from "../utils/api";

export const DESIGN_WIDTH = 1000;
export const DEFAULT_PRINT_AREA = { x: 0.3, y: 0.25, width: 0.4, height: 0.45, widthCm: 20 };
const VIEW_LABELS = { front: "Front", back: "Back", side: "Side" };

// Sides of the product that can be designed, with their photo and print area.
export function getProductViews(product) {
  if (!product) return [];
  const views = [{ key: "front", label: "Front", image: assetUrl(product.image), area: product.printAreas?.front || DEFAULT_PRINT_AREA }];
  for (const key of ["back", "side"]) {
    if (product.images?.[key]) {
      views.push({ key, label: VIEW_LABELS[key], image: assetUrl(product.images[key]), area: product.printAreas?.[key] || DEFAULT_PRINT_AREA });
    }
  }
  return views;
}

// Height of the print area in design units, given the product photo's size.
export function designHeight(area, imageWidth = 1, imageHeight = 1) {
  const h = (DESIGN_WIDTH * (area.height * imageHeight)) / (area.width * imageWidth);
  return Math.max(100, Math.round(h));
}

// Printed height of the print area in cm.
export const printHeightCm = (area, H) => (area.widthCm * H) / DESIGN_WIDTH;

export const newId = () => Math.random().toString(36).slice(2, 10);

export function createImageLayer({ assetId, src, naturalWidth, naturalHeight, H, fit = 0.6, name }) {
  const aspect = naturalWidth / naturalHeight || 1;
  let width = DESIGN_WIDTH * fit;
  let height = width / aspect;
  if (height > H * 0.85) {
    height = H * 0.85;
    width = height * aspect;
  }
  return {
    id: newId(),
    type: "image",
    name: name || "Image",
    assetId,
    src,
    naturalWidth,
    naturalHeight,
    x: DESIGN_WIDTH / 2,
    y: H / 2,
    width,
    height,
    rotation: 0,
    opacity: 1,
    frame: "none",
    flipX: false,
  };
}

export function createTextLayer(H, overrides = {}) {
  return {
    id: newId(),
    type: "text",
    name: "Text",
    text: "Your text",
    x: DESIGN_WIDTH / 2,
    y: H / 2,
    width: 800,
    height: 100,
    rotation: 0,
    opacity: 1,
    fontFamily: "Montserrat",
    fontSize: 90,
    fontStyle: "bold",
    fill: "#111111",
    align: "center",
    letterSpacing: 0,
    lineHeight: 1.1,
    stroke: "",
    strokeWidth: 0,
    ...overrides,
  };
}

export function createShapeLayer(type, H, overrides = {}) {
  const size = Math.min(DESIGN_WIDTH, H) * 0.5;
  return {
    id: newId(),
    type,
    name: type === "ellipse" ? "Circle" : "Rectangle",
    x: DESIGN_WIDTH / 2,
    y: H / 2,
    width: size,
    height: size,
    rotation: 0,
    opacity: 1,
    fill: "#7c0034",
    stroke: "",
    strokeWidth: 0,
    cornerRadius: type === "rect" ? 24 : 0,
    ...overrides,
  };
}

// Print quality of an image layer, in dots per inch at its printed size.
// Below ~150 DPI prints can look blurry.
export function imageDpi(layer, area) {
  if (layer.type !== "image" || !layer.naturalWidth) return null;
  const sourceWidth = layer.frame === "circle" ? Math.min(layer.naturalWidth, layer.naturalHeight) : layer.naturalWidth;
  const printedInches = ((layer.width / DESIGN_WIDTH) * area.widthCm) / 2.54;
  return Math.round(sourceWidth / printedInches);
}

export const LOW_DPI = 150;

// Readable label for the layers list
export function layerLabel(layer) {
  if (layer.type === "text") return layer.text?.split("\n")[0]?.slice(0, 24) || "Text";
  if (layer.type === "image") return layer.name || "Image";
  return layer.type === "ellipse" ? "Circle" : "Rectangle";
}

// Pixel width of the print file for a print area (300 DPI, capped to keep files manageable).
export function printPixelWidth(area) {
  return Math.round(Math.min(3000, Math.max(1200, (area.widthCm / 2.54) * 300)));
}
