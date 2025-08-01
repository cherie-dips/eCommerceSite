// routes/orders.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");

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
router.post("/", upload.single("customImage"), async (req, res) => {
  try {
    const { productId, customerId, orderId } = req.body;
    const filePath = req.file.path;

    const newOrder = new Order({
      productId,
      customerId,
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

module.exports = router;