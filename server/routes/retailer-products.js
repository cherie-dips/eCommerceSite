const express = require("express");
const Product = require("../models/Product");
const { verifyRetailer } = require("../middleware/authMiddleware");

const router = express.Router();

// The logged-in retailer's own products, including ones removed from the store.
router.get("/", verifyRetailer, async (req, res) => {
  try {
    const products = await Product.find({ retailerId: req.user.id })
      .sort({ active: -1, createdAt: -1 })
      .populate('retailerId', 'username email');
    res.json(products);
  } catch (err) {
    console.error("❌ Error fetching retailer products:", err);
    res.status(500).json({ error: "Failed to fetch products." });
  }
});

module.exports = router;
