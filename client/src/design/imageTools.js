// Reading uploaded photos/logos, and looking at their colours to suggest designs.

const MAX_SOURCE_PIXELS = 4000; // bigger photos are scaled down (still plenty for printing)
const MAX_FILE_MB = 15;

export function loadImage(url, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be loaded"));
    img.src = url;
  });
}

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

// Reads a file the user picked. Very large photos are scaled down so uploads stay quick.
// Returns { file, url, img, width, height }.
export async function readImageFile(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    throw new Error("Please choose a PNG, JPG or WebP image.");
  }
  if (file.size > 40 * 1024 * 1024) {
    throw new Error("That image is too large (over 40 MB).");
  }
  let url = URL.createObjectURL(file);
  let img = await loadImage(url);
  let outFile = file;

  const biggest = Math.max(img.naturalWidth, img.naturalHeight);
  if (biggest > MAX_SOURCE_PIXELS || file.size > MAX_FILE_MB * 1024 * 1024) {
    const scale = Math.min(1, MAX_SOURCE_PIXELS / biggest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const keepTransparency = file.type !== "image/jpeg";
    const blob = await canvasToBlob(canvas, keepTransparency ? "image/png" : "image/jpeg", 0.92);
    URL.revokeObjectURL(url);
    outFile = new File([blob], file.name.replace(/\.\w+$/, keepTransparency ? ".png" : ".jpg"), { type: blob.type });
    url = URL.createObjectURL(outFile);
    img = await loadImage(url);
  }
  return { file: outFile, url, img, width: img.naturalWidth, height: img.naturalHeight };
}

const toHex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

export const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Relative brightness, 0 (black) to 1 (white)
export const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Mixes a colour with white (amount 0-1)
export const tint = (hex, amount) => {
  const [r, g, b] = hexToRgb(hex);
  return toHex(...[r, g, b].map((v) => Math.round(v + (255 - v) * amount)));
};

// Looks at an image: main colours, whether it has a see-through background,
// and roughly how many colours it uses (few colours usually means a logo).
export function analyzeImage(img) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const buckets = new Map();
  let transparent = 0;
  let visible = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 32) {
      transparent += 1;
      continue;
    }
    visible += 1;
    // Group similar colours together (32 levels per channel)
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += data[i];
    bucket.g += data[i + 1];
    bucket.b += data[i + 2];
    buckets.set(key, bucket);
  }

  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  const colors = [];
  for (const b of sorted) {
    const hex = toHex(Math.round(b.r / b.count), Math.round(b.g / b.count), Math.round(b.b / b.count));
    // Skip colours that look almost the same as one already picked
    const [r, g, bl] = hexToRgb(hex);
    const tooClose = colors.some((c) => {
      const [r2, g2, b2] = hexToRgb(c);
      return Math.abs(r - r2) + Math.abs(g - g2) + Math.abs(bl - b2) < 60;
    });
    if (!tooClose) colors.push(hex);
    if (colors.length >= 6) break;
  }

  const significant = sorted.filter((b) => b.count > visible * 0.01).length;
  const hasTransparency = transparent > size * size * 0.04;
  // An accent colour: the most common colour that isn't near-white or near-black
  const accent = colors.find((c) => {
    const l = luminance(c);
    return l > 0.03 && l < 0.85;
  }) || colors[0] || "#7c0034";

  return {
    colors,
    accent,
    hasTransparency,
    colorCount: significant,
    isLogo: hasTransparency || significant < 14,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

// Average colour of part of the product photo (used to pick readable text colours).
export function sampleColor(img, area) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const sx = img.naturalWidth * (area.x + area.width * 0.25);
    const sy = img.naturalHeight * (area.y + area.height * 0.25);
    ctx.drawImage(img, sx, sy, img.naturalWidth * area.width * 0.5, img.naturalHeight * area.height * 0.5, 0, 0, 16, 16);
    const { data } = ctx.getImageData(0, 0, 16, 16);
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const n = data.length / 4;
    return toHex(Math.round(r / n), Math.round(g / n), Math.round(b / n));
  } catch {
    return "#ffffff"; // photo from another website that can't be read
  }
}

// Small copy of an image for the AI suggestions request.
export function imageToDataUrl(img, maxSize = 640, keepTransparency = true) {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return keepTransparency ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
}

export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}
