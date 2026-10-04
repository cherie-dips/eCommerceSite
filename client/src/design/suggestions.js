// Free "smart template" suggestions: after a photo or logo is uploaded, three ready
// layouts are built from its shape and colours. (AI suggestions from the server use
// the same layout format, so both are shown and applied the same way.)
import { DESIGN_WIDTH, newId } from "./designUtils";
import { contrastRatio, luminance, tint } from "./imageTools";

const W = DESIGN_WIDTH;
const MARGIN = 40;

// A text colour that is easy to read on `background`, preferring the logo's colours.
function readableOn(background, preferred = []) {
  for (const color of preferred) {
    if (color && contrastRatio(color, background) >= 3) return color;
  }
  return luminance(background) > 0.45 ? "#111111" : "#ffffff";
}

// Font size that fits a line of text into maxWidth (a rough estimate is enough here;
// the editor shows the real result and it can be adjusted).
function fitFontSize(text, maxWidth, maxSize, widthPerChar = 0.76) {
  const longest = Math.max(1, ...text.split("\n").map((line) => line.length));
  return Math.max(30, Math.round(Math.min(maxSize, maxWidth / (longest * widthPerChar))));
}

// Image size that keeps its shape and fits in maxWidth x maxHeight
function fitBox(aspect, maxWidth, maxHeight) {
  let width = maxWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return { width, height };
}

const textLayer = (props) => ({
  type: "text",
  fontFamily: "Montserrat",
  fontStyle: "bold",
  align: "center",
  letterSpacing: 0,
  rotation: 0,
  ...props,
});

export function templateSuggestions({ analysis, H, brandText, productColor = "#ffffff", category }) {
  const aspect = analysis.width / analysis.height || 1;
  const accent = analysis.accent;
  const name = (brandText || "").trim();
  const textColor = readableOn(productColor, [accent, ...analysis.colors]);
  const suggestions = [];

  if (analysis.isLogo) {
    // 1. Big and centred
    suggestions.push({
      name: "Clean & centred",
      description: "Your logo, big and centred.",
      layers: [{ type: "image", x: W / 2, y: H / 2, ...fitBox(aspect, W * 0.7, H * 0.72), frame: "none" }],
    });

    // 2. Logo with the brand name underneath
    const label = name || "Your Brand";
    const fontSize = fitFontSize(label, W * 0.85, Math.min(150, H * 0.17));
    const logo = fitBox(aspect, W * 0.55, H - fontSize * 1.2 - MARGIN * 4);
    const blockHeight = logo.height + MARGIN + fontSize * 1.1;
    const top = (H - blockHeight) / 2;
    suggestions.push({
      name: "Logo + name",
      description: name ? "Your logo with your brand name underneath." : "Logo with a name underneath. Type your brand name above to change it.",
      layers: [
        { type: "image", x: W / 2, y: top + logo.height / 2, ...logo, frame: "none" },
        textLayer({ text: label, x: W / 2, y: top + logo.height + MARGIN + fontSize * 0.55, width: W * 0.92, fontSize, fill: textColor, letterSpacing: Math.round(fontSize * 0.04) }),
      ],
    });

    if (category === "Apparel") {
      // 3. Small logo on the left chest (the wearer's left = right side when looking at the shirt)
      const small = fitBox(aspect, W * 0.26, H * 0.2);
      suggestions.push({
        name: "Left chest",
        description: "A small logo on the chest, like a uniform.",
        layers: [{ type: "image", x: W * 0.74, y: MARGIN * 2 + small.height / 2, ...small, frame: "none" }],
      });
    } else {
      // 3. Round badge in the logo's colour
      const d = Math.min(W, H) * 0.88;
      const badgeFill = luminance(productColor) > 0.5 ? tint(accent, 0.86) : "#ffffff";
      const badgeText = name ? fitFontSize(name, d * 0.62, d * 0.12) : 0;
      const badgeLogo = fitBox(aspect, d * 0.58, name ? d * 0.42 : d * 0.55);
      const logoY = name ? H / 2 - badgeText * 0.6 : H / 2;
      const layers = [
        { type: "ellipse", x: W / 2, y: H / 2, width: d, height: d, fill: badgeFill, stroke: accent, strokeWidth: Math.round(d * 0.03), rotation: 0, opacity: 1, cornerRadius: 0 },
        { type: "image", x: W / 2, y: logoY, ...badgeLogo, frame: "none" },
      ];
      if (name) {
        layers.push(textLayer({ text: name, x: W / 2, y: logoY + badgeLogo.height / 2 + badgeText * 0.9, width: d * 0.7, fontSize: badgeText, fill: readableOn(badgeFill, [accent]) }));
      }
      suggestions.push({ name: "Badge", description: "Your logo inside a round badge in its own colours.", layers });
    }
    return suggestions;
  }

  // ---- Photos ----
  // 1. Photo fills the print area
  const cover = aspect > W / H ? { width: H * aspect, height: H } : { width: W, height: W / aspect };
  suggestions.push({
    name: "Full photo",
    description: "Your photo fills the whole print area.",
    layers: [{ type: "image", x: W / 2, y: H / 2, ...cover, frame: "none" }],
  });

  // 2. Photo in a frame, with an optional caption
  // Pacifico (script font) is narrower per letter than the bold sans-serif
  const captionSize = name ? fitFontSize(name, W * 0.8, Math.min(110, H * 0.13), 0.55) : 0;
  const framed = fitBox(aspect, W * 0.8, H - MARGIN * 3 - (name ? captionSize * 1.5 : 0));
  const framedTop = (H - framed.height - (name ? captionSize * 1.5 : 0)) / 2;
  const framedLayers = [
    { type: "rect", x: W / 2, y: framedTop + framed.height / 2, width: framed.width + 36, height: framed.height + 36, fill: "#ffffff", stroke: accent, strokeWidth: 6, cornerRadius: 28, rotation: 0, opacity: 1 },
    { type: "image", x: W / 2, y: framedTop + framed.height / 2, ...framed, frame: "rounded" },
  ];
  if (name) {
    framedLayers.push(textLayer({ text: name, x: W / 2, y: framedTop + framed.height + 36 + captionSize * 0.7, width: W * 0.9, fontFamily: "Pacifico", fontStyle: "normal", fontSize: captionSize, fill: textColor }));
  }
  suggestions.push({ name: "Framed photo", description: "Your photo in a soft frame.", layers: framedLayers });

  // 3. Round portrait with a coloured ring
  const portraitText = name ? fitFontSize(name, W * 0.85, Math.min(110, H * 0.12)) : 0;
  const space = name ? H - portraitText * 1.8 : H;
  const d = Math.min(W, space) * 0.74;
  const centerY = name ? (space - MARGIN) / 2 + MARGIN / 2 : H / 2;
  const circleLayers = [
    { type: "ellipse", x: W / 2, y: centerY, width: d + 44, height: d + 44, fill: accent, stroke: "", strokeWidth: 0, rotation: 0, opacity: 1, cornerRadius: 0 },
    { type: "image", x: W / 2, y: centerY, width: d, height: d, frame: "circle" },
  ];
  if (name) {
    circleLayers.push(textLayer({ text: name, x: W / 2, y: centerY + d / 2 + 22 + portraitText * 0.8, width: W * 0.9, fontSize: portraitText, fill: textColor }));
  }
  suggestions.push({ name: "Round portrait", description: "Your photo in a circle with a coloured ring.", layers: circleLayers });
  return suggestions;
}

// Turns a suggestion into real editor layers that use the uploaded image.
export function materializeSuggestion(suggestion, image) {
  return suggestion.layers.map((l) => {
    const base = { id: newId(), rotation: l.rotation || 0, opacity: l.opacity ?? 1, x: l.x, y: l.y };
    if (l.type === "image") {
      const square = l.frame === "circle";
      const width = l.width;
      const height = square ? width : l.height ?? width / (image.naturalWidth / image.naturalHeight);
      return {
        ...base,
        type: "image",
        name: "Image",
        assetId: image.assetId,
        src: image.src,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        width,
        height,
        frame: l.frame || "none",
        flipX: false,
      };
    }
    if (l.type === "text") {
      return {
        ...base,
        type: "text",
        name: "Text",
        text: l.text,
        width: l.width,
        height: l.fontSize * 1.2,
        fontFamily: l.fontFamily,
        fontSize: l.fontSize,
        fontStyle: l.fontStyle || "normal",
        fill: l.fill,
        align: l.align || "center",
        letterSpacing: l.letterSpacing || 0,
        lineHeight: 1.1,
        stroke: "",
        strokeWidth: 0,
      };
    }
    return {
      ...base,
      type: l.type,
      name: l.type === "ellipse" ? "Circle" : "Rectangle",
      width: l.width,
      height: l.height,
      fill: l.fill,
      stroke: l.stroke || "",
      strokeWidth: l.strokeWidth || 0,
      cornerRadius: l.cornerRadius || 0,
    };
  });
}
