const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const { verifyToken, verifyApprovedRetailer } = require("../middleware/authMiddleware");
const { imageUploader, UPLOAD_DIRS, publicPath } = require("../utils/uploads");

const { CATEGORIES } = Product;
const router = express.Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const isUploadedOrUrl = (v) => typeof v === "string" && (/^uploads\/products\/[\w.-]+$/.test(v) || /^https?:\/\/\S+$/i.test(v));

const cleanPrintArea = (area) => {
  if (!area || typeof area !== "object") return undefined;
  const width = clamp(Number(area.width) || 0.4, 0.02, 1);
  const height = clamp(Number(area.height) || 0.4, 0.02, 1);
  return {
    x: clamp(Number(area.x) || 0, 0, 1 - width),
    y: clamp(Number(area.y) || 0, 0, 1 - height),
    width,
    height,
    widthCm: clamp(Number(area.widthCm) || 20, 1, 200),
  };
};

// Checks and tidies product details sent by a retailer. Returns { data } or { error }.
const cleanProduct = (body = {}, { partial = false } = {}) => {
  const data = {};
  const has = (key) => body[key] !== undefined;

  if (!partial || has("name")) {
    const name = String(body.name || "").trim();
    if (!name) return { error: "Product name is required." };
    data.name = name.slice(0, 120);
  }
  if (has("description")) data.description = String(body.description || "").trim().slice(0, 2000);
  if (has("category")) data.category = CATEGORIES.includes(body.category) ? body.category : "Other";
  if (!partial || has("price")) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0 || price > 1000000) return { error: "Enter a valid price." };
    data.price = Math.round(price * 100) / 100;
  }
  if (has("stock")) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) return { error: "Stock must be a whole number (0 or more)." };
    data.stock = stock;
  }
  if (!partial || has("image")) {
    if (!isUploadedOrUrl(body.image)) return { error: "Upload a product photo." };
    data.image = body.image;
  }
  if (has("images")) {
    data.images = {};
    for (const view of ["back", "side"]) {
      const value = body.images?.[view];
      if (value && !isUploadedOrUrl(value)) return { error: `The ${view} photo is not valid.` };
      if (value) data.images[view] = value;
    }
  }
  if (has("customizable")) data.customizable = Boolean(body.customizable);
  if (has("printAreas")) {
    data.printAreas = {};
    for (const view of ["front", "back", "side"]) {
      const area = cleanPrintArea(body.printAreas?.[view]);
      if (area) data.printAreas[view] = area;
    }
  }
  if (has("model3d")) data.model3d = body.model3d === "mug" ? "mug" : "";
  return { data };
};

const canManage = (req, product) =>
  req.user.role === "admin" || String(product.retailerId) === String(req.user.id);

// === List / search products (public) ===
// ?search=&category=&sort=newest|price_asc|price_desc|popular|rating&page=&limit=&customizable=true
router.get("/", async (req, res) => {
  const filter = { active: { $ne: false } };
  const search = String(req.query.search || "").trim();
  if (search) {
    const pattern = new RegExp(escapeRegex(search.slice(0, 80)), "i");
    filter.$or = [{ name: pattern }, { description: pattern }, { category: pattern }];
  }
  if (CATEGORIES.includes(req.query.category)) filter.category = req.query.category;
  if (req.query.customizable === "true") filter.customizable = { $ne: false };

  const sorts = {
    newest: { createdAt: -1 },
    price_asc: { price: 1, createdAt: -1 },
    price_desc: { price: -1, createdAt: -1 },
    popular: { soldCount: -1, createdAt: -1 },
    rating: { ratingAvg: -1, ratingCount: -1 },
  };
  const sort = sorts[req.query.sort] || sorts.newest;
  const limit = clamp(parseInt(req.query.limit, 10) || 12, 1, 48);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("retailerId", "username"),
    Product.countDocuments(filter),
  ]);
  res.json({ products, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get("/categories", (req, res) => res.json(CATEGORIES));

// === Upload a product photo (approved retailers) -> { path } ===
router.post(
  "/upload-image",
  verifyApprovedRetailer,
  imageUploader(UPLOAD_DIRS.products, { maxSizeMb: 8, single: "image" }),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });
    res.status(201).json({ path: publicPath(req.file) });
  }
);

// === Create product (approved retailers) ===
router.post("/", verifyApprovedRetailer, async (req, res) => {
  const { data, error } = cleanProduct(req.body);
  if (error) return res.status(400).json({ error });
  const product = await new Product({ ...data, retailerId: req.user.id }).save();
  res.status(201).json(product);
});

// === Get product by ID ===
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Product not found" });
  }
  const product = await Product.findById(req.params.id).populate("retailerId", "username");
  if (!product || product.active === false) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

// === Edit product (owner or admin) ===
router.put("/:id", verifyApprovedRetailer, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Product not found" });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (!canManage(req, product)) return res.status(403).json({ error: "You can only edit your own products." });

  const { data, error } = cleanProduct(req.body, { partial: true });
  if (error) return res.status(400).json({ error });
  if (req.body.active !== undefined) data.active = Boolean(req.body.active);
  product.set(data);
  await product.save();
  res.json(product);
});

// === Remove product (owner or admin). Hidden, not deleted, so old orders still show it. ===
router.delete("/:id", verifyApprovedRetailer, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Product not found" });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (!canManage(req, product)) return res.status(403).json({ error: "You can only remove your own products." });
  product.active = false;
  await product.save();
  res.json({ message: "Product removed from the store." });
});

// === Reviews ===
router.get("/:id/reviews", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Product not found" });
  const reviews = await Review.find({ productId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("userId", "username");
  res.json(
    reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      userId: r.userId?._id,
      username: r.userId?.username || "Customer",
    }))
  );
});

// Only customers who bought the product can review it. Posting again updates the review.
router.post("/:id/reviews", verifyToken, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Product not found" });
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Choose a rating from 1 to 5 stars." });
  }
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const bought = await Order.exists({
    productId: product._id,
    customerId: req.user.id,
    status: { $nin: ["pending_payment", "cancelled"] },
  });
  if (!bought) return res.status(403).json({ error: "You can review a product after you've ordered it." });

  const review = await Review.findOneAndUpdate(
    { productId: product._id, userId: req.user.id },
    { rating, comment: String(req.body?.comment || "").trim().slice(0, 1000) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const [summary] = await Review.aggregate([
    { $match: { productId: product._id } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  product.ratingAvg = Math.round((summary?.avg || 0) * 10) / 10;
  product.ratingCount = summary?.count || 0;
  await product.save();

  res.status(201).json({ review, ratingAvg: product.ratingAvg, ratingCount: product.ratingCount });
});

module.exports = router;
module.exports.cleanPrintArea = cleanPrintArea;
