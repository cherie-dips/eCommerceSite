const express = require("express");
const Product = require("../models/Product");
const { verifyToken, verifyRetailer } = require("../middleware/authMiddleware");

const router = express.Router();

// Create new product (retailer only)
router.post("/", verifyRetailer, async (req, res) => {
  try {
    const productData = {
      ...req.body,
      retailerId: req.user.id
    };
    const product = new Product(productData);
    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all products (public)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().populate('retailerId', 'username email');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like a product (if implemented)
router.patch("/:id/like", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } }, // You can also use `likedBy` if needed
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;