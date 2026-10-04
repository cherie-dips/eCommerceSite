// Customer designs: saved when the customer adds a customised product to the cart
// (or presses "Save design"). Orders point at a design so the retailer gets the
// preview picture and the print-ready files.
const express = require("express");
const mongoose = require("mongoose");
const Design = require("../models/Design");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { verifyToken } = require("../middleware/authMiddleware");
const { imageUploader, UPLOAD_DIRS, publicPath, requestFiles, removeFiles } = require("../utils/uploads");

const router = express.Router();

const MAX_LAYERS = 60;
const MAX_LAYER_JSON = 300 * 1024;
const VIEWS_2D = ["front", "back", "side"];

const uploadDesignFiles = imageUploader(UPLOAD_DIRS.designs, {
  maxSizeMb: 25,
  fields: [
    { name: "assets", maxCount: 12 },
    { name: "previews", maxCount: 4 },
    { name: "prints", maxCount: 4 },
  ],
});

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const str = (v, max = 200) => String(v ?? "").slice(0, max);
const color = (v, fallback) => (/^#[0-9a-f]{3,8}$/i.test(String(v)) ? String(v) : fallback);
const LAYER_TYPES = ["image", "text", "rect", "ellipse"];

// Keeps only the layer settings the editor understands. Image layers may only point
// at images uploaded with this design (or earlier designs), never at outside URLs.
const cleanLayer = (layer, assetPaths) => {
  if (!layer || !LAYER_TYPES.includes(layer.type)) return null;
  const clean = {
    id: str(layer.id, 40) || Math.random().toString(36).slice(2, 10),
    type: layer.type,
    x: num(layer.x),
    y: num(layer.y),
    width: Math.max(1, num(layer.width, 100)),
    height: Math.max(1, num(layer.height, 100)),
    rotation: num(layer.rotation),
    opacity: Math.min(1, Math.max(0, num(layer.opacity, 1))),
    locked: Boolean(layer.locked),
    name: str(layer.name, 60),
  };
  if (layer.type === "image") {
    let src = str(layer.src, 300);
    const assetMatch = /^asset:(\d+)$/.exec(src);
    if (assetMatch) src = assetPaths[Number(assetMatch[1])];
    if (!src || !/^uploads\/designs\/[\w.-]+$/.test(src)) return null;
    Object.assign(clean, {
      src,
      frame: ["none", "rounded", "circle"].includes(layer.frame) ? layer.frame : "none",
      flipX: Boolean(layer.flipX),
      naturalWidth: num(layer.naturalWidth),
      naturalHeight: num(layer.naturalHeight),
    });
  } else if (layer.type === "text") {
    Object.assign(clean, {
      text: str(layer.text, 500),
      fontFamily: str(layer.fontFamily, 60) || "Inter",
      fontSize: Math.max(4, num(layer.fontSize, 60)),
      fontStyle: ["normal", "bold", "italic", "bold italic", "italic bold"].includes(layer.fontStyle) ? layer.fontStyle : "normal",
      fill: color(layer.fill, "#111111"),
      align: ["left", "center", "right"].includes(layer.align) ? layer.align : "center",
      letterSpacing: num(layer.letterSpacing),
      lineHeight: Math.max(0.5, num(layer.lineHeight, 1.1)),
      stroke: layer.stroke ? color(layer.stroke, "") : "",
      strokeWidth: Math.max(0, num(layer.strokeWidth)),
      textDecoration: layer.textDecoration === "underline" ? "underline" : "",
    });
  } else {
    Object.assign(clean, {
      fill: color(layer.fill, "#7c0034"),
      stroke: layer.stroke ? color(layer.stroke, "") : "",
      strokeWidth: Math.max(0, num(layer.strokeWidth)),
      cornerRadius: Math.max(0, num(layer.cornerRadius)),
    });
  }
  return clean;
};

// === Save a design ===
router.post("/", verifyToken, uploadDesignFiles, async (req, res) => {
  const files = requestFiles(req);
  const fail = (status, error) => {
    removeFiles(files);
    return res.status(status).json({ error });
  };

  let data;
  try {
    data = JSON.parse(req.body.data || "{}");
  } catch {
    return fail(400, "Invalid design data.");
  }
  if (JSON.stringify(data).length > MAX_LAYER_JSON) return fail(400, "This design is too large.");

  if (!mongoose.isValidObjectId(data.productId)) return fail(400, "Unknown product.");
  const product = await Product.findById(data.productId);
  if (!product || product.active === false) return fail(404, "Product not found.");

  const mode = data.mode === "3d" ? "3d" : "2d";
  if (mode === "2d" && product.customizable === false) return fail(400, "This product can't be customised.");

  const views = Array.isArray(data.views) ? data.views.slice(0, 3) : [];
  if (!views.length) return fail(400, "The design is empty.");

  const assets = (req.files?.assets || []).map(publicPath);
  const previews = req.files?.previews || [];
  const prints = req.files?.prints || [];
  if (previews.length !== views.length) return fail(400, "A preview picture is missing.");
  if (mode === "2d" && prints.length !== views.length) return fail(400, "A print file is missing.");

  const cleanViews = [];
  for (const [i, view] of views.entries()) {
    const name = mode === "3d" ? "3d" : view.view;
    if (mode === "2d" && !VIEWS_2D.includes(name)) return fail(400, "Unknown product side.");
    const rawLayers = Array.isArray(view.layers) ? view.layers.slice(0, MAX_LAYERS) : [];
    // 3D designs keep their own logo placement details; 2D layers are checked one by one.
    const layers = mode === "3d"
      ? rawLayers.map((l) => ({ ...l, src: /^asset:(\d+)$/.test(l?.src) ? assets[Number(l.src.slice(6))] : undefined }))
      : rawLayers.map((l) => cleanLayer(l, assets)).filter(Boolean);
    cleanViews.push({
      view: name,
      layers,
      previewPath: publicPath(previews[i]),
      printPath: prints[i] ? publicPath(prints[i]) : undefined,
    });
  }

  const design = await new Design({
    userId: req.user.id,
    productId: product._id,
    mode,
    name: str(data.name, 80) || `${product.name} design`,
    views: cleanViews,
    previewPath: cleanViews[0].previewPath,
    assets,
    // Small extra details only (e.g. the 3D mug colour)
    meta: data.meta && typeof data.meta === "object" && JSON.stringify(data.meta).length <= 5000 ? data.meta : undefined,
  }).save();

  res.status(201).json(design);
});

// === The user's saved designs ===
router.get("/mine", verifyToken, async (req, res) => {
  const designs = await Design.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(60)
    .populate("productId", "name price image active");
  res.json(designs);
});

// === One design: its owner, an admin, or a retailer with an order for it ===
router.get("/:id", verifyToken, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Design not found." });
  const design = await Design.findById(req.params.id);
  if (!design) return res.status(404).json({ error: "Design not found." });
  const isOwner = String(design.userId) === String(req.user.id);
  const isRetailerOfOrder =
    req.user.role === "retailer" &&
    (await Order.exists({ designId: design._id, retailerId: req.user.id }));
  if (!isOwner && req.user.role !== "admin" && !isRetailerOfOrder) {
    return res.status(404).json({ error: "Design not found." });
  }
  res.json(design);
});

// === Delete a saved design (only if it isn't part of an order) ===
router.delete("/:id", verifyToken, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Design not found." });
  const design = await Design.findOne({ _id: req.params.id, userId: req.user.id });
  if (!design) return res.status(404).json({ error: "Design not found." });
  if (await Order.exists({ designId: design._id })) {
    return res.status(409).json({ error: "This design is part of an order, so it's kept." });
  }
  await design.deleteOne();
  res.json({ message: "Design deleted." });
});

module.exports = router;
