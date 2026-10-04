// Admin panel: approve sellers, manage users and products, see store totals.
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Checkout = require("../models/Checkout");
const { verifyAdmin } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(verifyAdmin);

router.get("/stats", async (req, res) => {
  const [users, retailers, pendingRetailers, products, paidCheckouts, openLines] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "retailer" }),
    User.countDocuments({ role: "retailer", approved: false }),
    Product.countDocuments({ active: { $ne: false } }),
    Checkout.find({ status: "paid" }).select("amount"),
    Order.countDocuments({ status: { $in: ["paid", "processing"] } }),
  ]);
  res.json({
    users,
    retailers,
    pendingRetailers,
    products,
    orders: paidCheckouts.length,
    revenue: paidCheckouts.reduce((sum, c) => sum + (c.amount || 0), 0),
    openLines,
  });
});

// ?role=user|retailer|admin&pending=true&search=
router.get("/users", async (req, res) => {
  const filter = {};
  if (["user", "retailer", "admin"].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.pending === "true") Object.assign(filter, { role: "retailer", approved: false });
  const search = String(req.query.search || "").trim();
  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 80), "i");
    filter.$or = [{ username: pattern }, { email: pattern }];
  }
  const users = await User.find(filter)
    .select("username email role approved emailVerified createdAt googleId")
    .sort({ createdAt: -1 })
    .limit(200);
  res.json(users);
});

// Change a user's role or approve/block a seller. Body: { role?, approved? }
router.patch("/users/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "User not found." });
  if (String(req.params.id) === String(req.user.id) && req.body?.role && req.body.role !== "admin") {
    return res.status(400).json({ error: "You can't remove your own admin access." });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (req.body?.role !== undefined) {
    if (!["user", "retailer", "admin"].includes(req.body.role)) return res.status(400).json({ error: "Unknown role." });
    user.role = req.body.role;
  }
  if (req.body?.approved !== undefined) user.approved = Boolean(req.body.approved);
  await user.save();
  res.json({ _id: user._id, username: user.username, email: user.email, role: user.role, approved: user.approved });
});

router.get("/products", async (req, res) => {
  const products = await Product.find()
    .populate("retailerId", "username email")
    .sort({ createdAt: -1 })
    .limit(300);
  res.json(products);
});

// Hide or show a product in the store. Body: { active }
router.patch("/products/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Product not found." });
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { active: Boolean(req.body?.active) },
    { new: true }
  );
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json(product);
});

module.exports = router;
