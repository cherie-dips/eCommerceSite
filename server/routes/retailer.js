const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { verifyRetailer } = require("../middleware/authMiddleware");
const { loginLimiter, accountLimiter } = require("../utils/rateLimits");
const { register, login, googleLogin } = require("./authHandlers");

const router = express.Router();

// Retailer sign-up always creates a retailer account (waiting for admin approval).
router.post("/register", accountLimiter, register("retailer"));
// Same login as customers; the response carries the account's real role.
router.post("/login", loginLimiter, login);
router.post("/google", loginLimiter, googleLogin("retailer"));

// Numbers for the retailer dashboard
router.get("/stats", verifyRetailer, async (req, res) => {
  const retailerId = req.user.id;
  const [products, lines] = await Promise.all([
    Product.countDocuments({ retailerId, active: true }),
    Order.find({ retailerId, status: { $ne: "pending_payment" } }).select("status quantity unitPrice"),
  ]);
  const paidLines = lines.filter((l) => l.status !== "cancelled");
  res.json({
    products,
    orders: paidLines.length,
    toFulfil: paidLines.filter((l) => ["paid", "processing"].includes(l.status)).length,
    revenue: paidLines.reduce((sum, l) => sum + (l.unitPrice || 0) * (l.quantity || 1), 0),
  });
});

module.exports = router;
