const express = require("express");
const Product = require("../models/Product");
const { verifyRetailer } = require("../middleware/authMiddleware");

const router = express.Router();

// Get products by retailer (retailer only)
router.get("/", verifyRetailer, async (req, res) => {
  try {
    console.log("🔍 Fetching products for retailer:", req.user.id, "- Role:", req.user.role);
    const products = await Product.find({ retailerId: req.user.id }).populate('retailerId', 'username email');
    console.log("✅ Found products:", products.length);
    res.json(products);
  } catch (err) {
    console.error("❌ Error fetching retailer products:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;