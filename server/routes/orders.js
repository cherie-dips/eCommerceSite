// routes/orders.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { verifyToken, verifyRetailer } = require("../middleware/authMiddleware");

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./uploads/customizations";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Create new customized order
router.post("/", verifyToken, upload.single("customImage"), async (req, res) => {
  try {
    const { productId, orderId } = req.body;
    const filePath = req.file.path;

    // Get product to find retailer
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const newOrder = new Order({
      productId,
      customerId: req.user.id,
      retailerId: product.retailerId,
      orderId,
      imagePath: filePath,
    });

    const saved = await newOrder.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ error: "Failed to save order." });
  }
});

// Get orders by retailer (retailer only)
router.get("/retailer", verifyRetailer, async (req, res) => {
  try {
    const orders = await Order.find({ retailerId: req.user.id })
      .populate('productId', 'name price image')
      .populate('customerId', 'username email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

// Get orders by customer (authenticated user only)
router.get("/customer", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user.id })
      .populate('productId', 'name price image')
      .populate('retailerId', 'username email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

// List all orders (admin only - optional)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('productId', 'name price image')
      .populate('customerId', 'username email')
      .populate('retailerId', 'username email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

module.exports = router;