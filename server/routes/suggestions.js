// AI design suggestions (optional). Turned on by setting ANTHROPIC_API_KEY in server/.env.
// The website always offers free "smart template" suggestions; this route adds
// AI-made layouts on top. Each request costs a little, so users get a few per hour.
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const config = require("../config");
const { verifyToken } = require("../middleware/authMiddleware");
const { aiLimiter } = require("../utils/rateLimits");

const router = express.Router();

// Fonts the design editor has loaded (keep in sync with client/src/design/fonts.js)
const FONTS = ["Inter", "Poppins", "Montserrat", "Playfair Display", "Bebas Neue", "Pacifico", "Roboto Slab", "Lobster"];
const FONT_STYLES = ["normal", "bold", "italic", "bold italic"];

let anthropic = null;
const getClient = () => (anthropic ||= new Anthropic());
// Lets tests replace the real API client.
const setClientForTests = (client) => {
  anthropic = client;
};

// ---- Response format the model must follow ----
const num = { type: "number" };
const imageLayer = {
  type: "object",
  properties: {
    type: { type: "string", const: "image" },
    x: num, y: num, width: num, rotation: num, opacity: num,
    frame: { type: "string", enum: ["none", "rounded", "circle"] },
  },
  required: ["type", "x", "y", "width", "rotation", "opacity", "frame"],
  additionalProperties: false,
};
const textLayer = {
  type: "object",
  properties: {
    type: { type: "string", const: "text" },
    text: { type: "string" },
    x: num, y: num, width: num, rotation: num,
    fontFamily: { type: "string", enum: FONTS },
    fontSize: num,
    fontStyle: { type: "string", enum: FONT_STYLES },
    fill: { type: "string" },
    align: { type: "string", enum: ["left", "center", "right"] },
    letterSpacing: num,
  },
  required: ["type", "text", "x", "y", "width", "rotation", "fontFamily", "fontSize", "fontStyle", "fill", "align", "letterSpacing"],
  additionalProperties: false,
};
const shapeLayer = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["rect", "ellipse"] },
    x: num, y: num, width: num, height: num, rotation: num, opacity: num,
    fill: { type: "string" },
    stroke: { type: "string" },
    strokeWidth: num,
    cornerRadius: num,
  },
  required: ["type", "x", "y", "width", "height", "rotation", "opacity", "fill", "stroke", "strokeWidth", "cornerRadius"],
  additionalProperties: false,
};
const SUGGESTIONS_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          layers: { type: "array", items: { anyOf: [shapeLayer, imageLayer, textLayer] } },
        },
        required: ["name", "description", "layers"],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a senior graphic designer who creates print layouts for custom merchandise such as mugs, T-shirts, tote bags and notebooks. Customers upload a logo or photo and pick from your layouts, then fine-tune them in an editor.

You design inside a rectangular print area. Coordinates use a canvas that is 1000 units wide; its height is given in the request. (0,0) is the top-left corner. For every layer, x and y are the CENTER of the layer, and rotation is in degrees.

Layers are drawn in list order: the first layer is at the back. Layer types:
- "image": the customer's uploaded image. Its height follows the image's own aspect ratio, so you only choose its width. "frame" can crop it to a rounded rectangle or a circle (circle crops to a square first), which suits photos more than logos.
- "text": short text. fontSize is in canvas units. Use only the listed fonts.
- "rect" / "ellipse": optional background shapes, badges, frames or accent bars. Use "" for no stroke.

What makes a good set of suggestions:
- Exactly 3 suggestions that look clearly different from each other, for example one clean and minimal, one that pairs the image with text, and one more decorative (badge, frame or bold background).
- Every suggestion uses the uploaded image exactly once.
- Everything stays inside the canvas with at least 40 units of margin. Text is readable when printed: fontSize between 40 and 220, at most 2 short lines.
- If brand text is provided, use it exactly as written. If not, either use no text or a short, generic, tasteful line that suits the product (never invent company names or claims).
- Colors come from the image's palette or neutral tones, and must contrast with the product color so they print clearly. Use hex colors like "#1a2b3c".
- Respect the image: don't stretch it, cover it with text, or make a logo tiny.
- name: at most 4 words. description: one short sentence a customer understands.`;

const clamp = (n, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(n)) ? Number(n) : min));
const hex = (v, fallback) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : fallback);

// Makes sure every number and colour from the model is usable before it reaches the editor.
function sanitizeSuggestions(raw, canvasHeight, imageAspect) {
  const H = canvasHeight;
  const out = [];
  for (const s of (raw?.suggestions || []).slice(0, 3)) {
    const layers = [];
    let imageCount = 0;
    for (const l of (s.layers || []).slice(0, 12)) {
      if (l.type === "image") {
        if (imageCount++) continue;
        const width = clamp(l.width, 80, 1000);
        layers.push({
          type: "image",
          x: clamp(l.x, 0, 1000), y: clamp(l.y, 0, H),
          width, height: width / imageAspect,
          rotation: clamp(l.rotation, -180, 180),
          opacity: clamp(l.opacity ?? 1, 0.1, 1),
          frame: ["none", "rounded", "circle"].includes(l.frame) ? l.frame : "none",
        });
      } else if (l.type === "text") {
        const text = String(l.text || "").trim().slice(0, 60);
        if (!text) continue;
        layers.push({
          type: "text",
          text,
          x: clamp(l.x, 0, 1000), y: clamp(l.y, 0, H),
          width: clamp(l.width, 100, 1000),
          rotation: clamp(l.rotation, -180, 180),
          fontFamily: FONTS.includes(l.fontFamily) ? l.fontFamily : "Inter",
          fontSize: clamp(l.fontSize, 30, 240),
          fontStyle: FONT_STYLES.includes(l.fontStyle) ? l.fontStyle : "normal",
          fill: hex(l.fill, "#111111"),
          align: ["left", "center", "right"].includes(l.align) ? l.align : "center",
          letterSpacing: clamp(l.letterSpacing, -5, 40),
        });
      } else if (l.type === "rect" || l.type === "ellipse") {
        layers.push({
          type: l.type,
          x: clamp(l.x, 0, 1000), y: clamp(l.y, 0, H),
          width: clamp(l.width, 10, 1000), height: clamp(l.height, 10, H),
          rotation: clamp(l.rotation, -180, 180),
          opacity: clamp(l.opacity ?? 1, 0.05, 1),
          fill: hex(l.fill, "#7c0034"),
          stroke: l.stroke ? hex(l.stroke, "") : "",
          strokeWidth: clamp(l.strokeWidth, 0, 40),
          cornerRadius: clamp(l.cornerRadius, 0, 500),
        });
      }
    }
    if (imageCount) {
      out.push({
        name: String(s.name || "AI idea").slice(0, 40),
        description: String(s.description || "").slice(0, 160),
        layers,
      });
    }
  }
  return out;
}

router.get("/status", (req, res) => res.json({ ai: config.ai.enabled }));

router.post("/ai", verifyToken, aiLimiter, express.json({ limit: "4mb" }), async (req, res) => {
  if (!config.ai.enabled) return res.status(404).json({ error: "AI suggestions are not turned on." });

  const { image, imageInfo = {}, product = {}, printArea = {}, brandText, productColor } = req.body || {};
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(image || ""));
  if (!match) return res.status(400).json({ error: "Send the logo or photo as a PNG, JPG or WebP image." });
  if (match[2].length > 3 * 1024 * 1024 * 1.37) return res.status(400).json({ error: "The image is too large." });

  const canvasHeight = Math.round(clamp(printArea.height, 100, 3000));
  const imageAspect = clamp(Number(imageInfo.width) / Number(imageInfo.height) || 1, 0.1, 10);
  const context = {
    product: { name: String(product.name || "").slice(0, 80), category: String(product.category || "").slice(0, 40) },
    canvas: { width: 1000, height: canvasHeight, printedWidthCm: clamp(printArea.widthCm, 1, 200) },
    productColor: hex(productColor, "#ffffff"),
    image: {
      aspectRatio: Math.round(imageAspect * 1000) / 1000,
      hasTransparentBackground: Boolean(imageInfo.hasTransparency),
      looksLike: imageInfo.hasTransparency || (imageInfo.colorCount && imageInfo.colorCount < 12) ? "logo" : "photo",
      palette: Array.isArray(imageInfo.colors) ? imageInfo.colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 6) : [],
    },
    brandText: brandText ? String(brandText).trim().slice(0, 60) : null,
    fonts: FONTS,
  };

  try {
    const response = await getClient().beta.messages.create({
      model: config.ai.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SUGGESTIONS_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: match[1], data: match[2] } },
            { type: "text", text: `Design 3 layouts for this upload.\n\n${JSON.stringify(context, null, 2)}` },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "The AI couldn't make suggestions for this image. Try the free suggestions instead." });
    }
    if (response.stop_reason === "max_tokens") {
      return res.status(502).json({ error: "The AI suggestions were cut short. Please try again." });
    }
    const text = response.content.find((b) => b.type === "text")?.text;
    let parsed;
    try {
      parsed = JSON.parse(text || "{}");
    } catch {
      return res.status(502).json({ error: "The AI sent back something unexpected. Please try again." });
    }
    const suggestions = sanitizeSuggestions(parsed, canvasHeight, imageAspect);
    if (!suggestions.length) return res.status(502).json({ error: "The AI didn't come up with usable layouts. Please try again." });
    res.json({ suggestions });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(503).json({ error: "The AI is busy right now. Please try again in a minute." });
    }
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error("AI suggestions: check ANTHROPIC_API_KEY -", err.message);
      return res.status(503).json({ error: "AI suggestions are not available right now." });
    }
    if (err instanceof Anthropic.BadRequestError) {
      console.error("AI suggestions request was rejected:", err.message);
      return res.status(502).json({ error: "The AI couldn't use this image. Try a different one." });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return res.status(503).json({ error: "Couldn't reach the AI service. Please try again." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`AI suggestions API error ${err.status}:`, err.message);
      return res.status(502).json({ error: "AI suggestions failed. Please try again." });
    }
    throw err;
  }
});

module.exports = router;
module.exports.sanitizeSuggestions = sanitizeSuggestions;
module.exports.setClientForTests = setClientForTests;
module.exports.SUGGESTIONS_SCHEMA = SUGGESTIONS_SCHEMA;
