// routes/orders.js
const express = require("express");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const Order = require("../models/Order");
const Checkout = require("../models/Checkout");
const Product = require("../models/Product");
const Design = require("../models/Design");
const User = require("../models/User");
const { verifyToken, verifyRetailer, verifyAdmin } = require("../middleware/authMiddleware");
const { createRazorpayOrder, verifyPaymentSignature, refundPayment } = require("../utils/payments");
const { emails } = require("../utils/email");
const { restock, finalizePaidOrder, cancelUnpaidOrder, refundIfPaid } = require("../services/orders");

const router = express.Router();

// Keep in sync with DISCOUNT_CODES in client/src/context/CartContext.jsx
const DISCOUNT_CODES = { SAVE10: 0.1 };
const MAX_QUANTITY = 100;
const MAX_LINES = 50;

const round2 = (n) => Math.round(n * 100) / 100;

const cleanAddress = (a = {}) => ({
  name: String(a.name || "").trim().slice(0, 80),
  phone: String(a.phone || "").trim().slice(0, 20),
  line: String(a.line || "").trim().slice(0, 300),
  city: String(a.city || "").trim().slice(0, 80),
  state: String(a.state || "").trim().slice(0, 80),
  pincode: String(a.pincode || "").trim().slice(0, 12),
});

// === Place an order for everything in the cart ===
// Body: { items: [{ productId, quantity, designId? }], address: {...}, discountCode? }
// Stock is reserved straight away. With Razorpay keys set, the order waits for payment
// (POST /:orderId/verify-payment); without keys it is paid immediately (test mode).
router.post("/", verifyToken, async (req, res) => {
  const { items, discountCode: rawCode } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Your cart is empty." });
  if (items.length > MAX_LINES) return res.status(400).json({ error: "Too many items in one order." });

  const address = cleanAddress(req.body.address);
  if (!address.line || !address.pincode) return res.status(400).json({ error: "A delivery address is required." });

  for (const item of items) {
    if (!mongoose.isValidObjectId(item?.productId)) return res.status(400).json({ error: "Your cart has an invalid product." });
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      return res.status(400).json({ error: `Quantity must be between 1 and ${MAX_QUANTITY}.` });
    }
    if (item.designId && !mongoose.isValidObjectId(item.designId)) return res.status(400).json({ error: "Your cart has an invalid design." });
  }

  const discountCode = String(rawCode || "").trim().toUpperCase();
  if (discountCode && !(discountCode in DISCOUNT_CODES)) return res.status(400).json({ error: "Invalid discount code." });
  const discountRate = discountCode ? DISCOUNT_CODES[discountCode] : 0;

  // Products and designs
  const productIds = [...new Set(items.map((i) => String(i.productId)))];
  const products = await Product.find({ _id: { $in: productIds }, active: { $ne: false } });
  const productsById = new Map(products.map((p) => [String(p._id), p]));
  if (productsById.size !== productIds.length) {
    return res.status(404).json({ error: "Some products in your cart are no longer available." });
  }
  const designIds = items.filter((i) => i.designId).map((i) => i.designId);
  const designs = await Design.find({ _id: { $in: designIds }, userId: req.user.id });
  const designsById = new Map(designs.map((d) => [String(d._id), d]));
  for (const item of items) {
    if (!item.designId) continue;
    const design = designsById.get(String(item.designId));
    if (!design || String(design.productId) !== String(item.productId)) {
      return res.status(400).json({ error: "A design in your cart could not be found. Please add it again." });
    }
  }

  // Reserve stock (all or nothing)
  const wanted = new Map();
  for (const item of items) wanted.set(String(item.productId), (wanted.get(String(item.productId)) || 0) + item.quantity);
  const reserved = [];
  for (const [productId, quantity] of wanted) {
    const result = await Product.updateOne({ _id: productId, stock: { $gte: quantity } }, { $inc: { stock: -quantity } });
    if (result.modifiedCount !== 1) {
      await restock(reserved);
      const product = productsById.get(productId);
      return res.status(409).json({
        error: product.stock > 0
          ? `Only ${product.stock} left of ${product.name}.`
          : `${product.name} is out of stock.`,
      });
    }
    reserved.push({ productId, quantity });
  }

  const orderId = `ORD-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
  const provider = config.razorpay.enabled ? "razorpay" : "test";
  const now = new Date();

  try {
    const docs = items.map((item) => {
      const product = productsById.get(String(item.productId));
      const design = item.designId ? designsById.get(String(item.designId)) : null;
      return {
        orderId,
        productId: product._id,
        productName: product.name,
        customerId: req.user.id,
        retailerId: product.retailerId,
        quantity: item.quantity,
        // The price always comes from the database, never from the browser.
        unitPrice: round2(product.price * (1 - discountRate)),
        discountCode: discountCode || undefined,
        paymentMethod: provider,
        address,
        designId: design?._id,
        imagePath: design?.previewPath,
        printFiles: design ? design.views.filter((v) => v.printPath).map((v) => ({ view: v.view, path: v.printPath })) : [],
        status: "pending_payment",
        statusHistory: [{ status: "pending_payment", at: now }],
      };
    });
    const subtotal = round2(items.reduce((sum, item) => sum + productsById.get(String(item.productId)).price * item.quantity, 0));
    const amount = round2(docs.reduce((sum, d) => sum + d.unitPrice * d.quantity, 0));

    await Order.insertMany(docs);
    const checkout = await new Checkout({
      orderId,
      customerId: req.user.id,
      subtotal,
      discount: round2(subtotal - amount),
      amount,
      discountCode: discountCode || undefined,
      provider,
    }).save();

    if (provider === "test") {
      await finalizePaidOrder(orderId);
      return res.status(201).json({ orderId, amount, payment: { provider: "test", status: "paid" } });
    }

    const razorpayOrder = await createRazorpayOrder({
      amount,
      receipt: orderId,
      notes: { orderId, customerId: String(req.user.id) },
    });
    checkout.razorpayOrderId = razorpayOrder.id;
    await checkout.save();

    const customer = await User.findById(req.user.id).select("username email");
    res.status(201).json({
      orderId,
      amount,
      payment: {
        provider: "razorpay",
        keyId: config.razorpay.keyId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        prefill: { name: address.name || customer?.username, email: customer?.email, contact: address.phone },
      },
    });
  } catch (err) {
    console.error("Order creation error:", err);
    // All or nothing: undo the order and free the stock.
    await Order.deleteMany({ orderId }).catch(() => {});
    await Checkout.deleteOne({ orderId }).catch(() => {});
    await restock(reserved).catch(() => {});
    res.status(500).json({ error: "Your order could not be placed. You have not been charged. Please try again." });
  }
});

// === Confirm a Razorpay payment (called by the website after the payment window closes) ===
router.post("/:orderId/verify-payment", verifyToken, async (req, res) => {
  const checkout = await Checkout.findOne({ orderId: req.params.orderId, customerId: req.user.id });
  if (!checkout) return res.status(404).json({ error: "Order not found." });
  if (checkout.status === "paid") return res.json({ orderId: checkout.orderId, status: "paid" });

  const { razorpay_payment_id: paymentId, razorpay_order_id: razorpayOrderId, razorpay_signature: signature } = req.body || {};
  if (checkout.provider !== "razorpay" || razorpayOrderId !== checkout.razorpayOrderId ||
      !verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId: paymentId, signature })) {
    return res.status(400).json({ error: "We couldn't confirm this payment. If money was taken, it will be refunded automatically." });
  }

  if (checkout.status === "cancelled") {
    // Paid after the order had already expired: give the money back.
    await refundPayment(paymentId).catch((err) => console.error("Refund failed:", err.message));
    return res.status(409).json({ error: "This order expired before the payment finished. Your money is being refunded." });
  }

  await finalizePaidOrder(checkout.orderId, { razorpayPaymentId: paymentId });
  res.json({ orderId: checkout.orderId, status: "paid" });
});

// === Customer cancels an order ===
// Unpaid orders are simply cancelled. Paid orders can be cancelled until the retailer
// starts working on them; Razorpay payments are refunded automatically.
router.post("/:orderId/cancel", verifyToken, async (req, res) => {
  const checkout = await Checkout.findOne({ orderId: req.params.orderId, customerId: req.user.id });
  if (!checkout) return res.status(404).json({ error: "Order not found." });

  if (checkout.status === "pending") {
    await cancelUnpaidOrder(checkout.orderId);
    return res.json({ message: "Order cancelled." });
  }
  if (checkout.status !== "paid") return res.status(400).json({ error: "This order can't be cancelled." });

  const lines = await Order.find({ orderId: checkout.orderId });
  if (lines.some((l) => !["paid", "cancelled"].includes(l.status))) {
    return res.status(400).json({ error: "The seller has already started on this order, so it can't be cancelled here. Please contact support." });
  }
  const open = lines.filter((l) => l.status === "paid");
  const refundAmount = round2(open.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  try {
    await refundIfPaid(checkout, refundAmount);
  } catch (err) {
    console.error("Refund failed:", err.message);
    return res.status(502).json({ error: "We couldn't start the refund right now. Please try again in a few minutes." });
  }
  await Order.updateMany(
    { _id: { $in: open.map((l) => l._id) } },
    { $set: { status: "cancelled" }, $push: { statusHistory: { status: "cancelled", at: new Date() } } }
  );
  await restock(open);
  checkout.status = "cancelled";
  await checkout.save();
  res.json({
    message: checkout.provider === "razorpay" ? "Order cancelled. Your refund is on its way (usually 5-7 working days)." : "Order cancelled.",
  });
});

// === Customer's orders, grouped by checkout ===
router.get("/customer", verifyToken, async (req, res) => {
  try {
    const [lines, checkouts] = await Promise.all([
      Order.find({ customerId: req.user.id })
        .populate('productId', 'name price image')
        .populate('retailerId', 'username')
        .sort({ createdAt: -1 }),
      Checkout.find({ customerId: req.user.id }),
    ]);
    const checkoutsById = new Map(checkouts.map((c) => [c.orderId, c]));
    const groups = new Map();
    for (const line of lines) {
      const key = line.orderId || String(line._id);
      if (!groups.has(key)) {
        const checkout = checkoutsById.get(line.orderId);
        groups.set(key, {
          orderId: key,
          createdAt: line.createdAt,
          address: line.address,
          paymentStatus: checkout?.status || "paid",
          provider: checkout?.provider,
          amount: checkout?.amount,
          discount: checkout?.discount || 0,
          lines: [],
        });
      }
      groups.get(key).lines.push(line);
    }
    const orders = [...groups.values()].map((o) => ({
      ...o,
      amount: o.amount ?? round2(o.lines.reduce((s, l) => s + (l.unitPrice ?? l.productId?.price ?? 0) * (l.quantity || 1), 0)),
    }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

// Get orders by retailer (retailer only). Unpaid orders are not shown.
router.get("/retailer", verifyRetailer, async (req, res) => {
  try {
    const orders = await Order.find({ retailerId: req.user.id, status: { $ne: "pending_payment" } })
      .populate('productId', 'name price image')
      .populate('customerId', 'username email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

// === Retailer updates an order line: processing -> shipped (with tracking) -> delivered ===
const NEXT_STATUSES = {
  paid: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  sent_to_delivery: ["delivered"],
};

router.patch("/lines/:lineId", verifyRetailer, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.lineId)) return res.status(404).json({ error: "Order not found." });
  const line = await Order.findById(req.params.lineId);
  if (!line || (req.user.role !== "admin" && String(line.retailerId) !== String(req.user.id))) {
    return res.status(404).json({ error: "Order not found." });
  }

  const { status } = req.body || {};
  const courier = req.body?.courier !== undefined ? String(req.body.courier).trim().slice(0, 60) : undefined;
  const trackingId = req.body?.trackingId !== undefined ? String(req.body.trackingId).trim().slice(0, 80) : undefined;

  if (status && status !== line.status) {
    if (!(NEXT_STATUSES[line.status] || []).includes(status)) {
      return res.status(400).json({ error: `An order that is "${line.status}" can't be marked "${status}".` });
    }
    if (status === "shipped" && !(trackingId || line.trackingId)) {
      return res.status(400).json({ error: "Add the courier's tracking ID before marking it shipped." });
    }
    if (status === "cancelled") {
      const checkout = await Checkout.findOne({ orderId: line.orderId });
      try {
        if (checkout) await refundIfPaid(checkout, round2(line.unitPrice * line.quantity));
      } catch (err) {
        console.error("Refund failed:", err.message);
        return res.status(502).json({ error: "We couldn't refund the customer right now. Please try again." });
      }
      await restock([line]);
    }
    line.status = status;
    line.statusHistory.push({ status, at: new Date() });
  }
  if (courier !== undefined) line.courier = courier;
  if (trackingId !== undefined) line.trackingId = trackingId;
  await line.save();

  if (status && ["shipped", "delivered", "cancelled"].includes(status)) {
    const customer = await User.findById(line.customerId);
    if (customer) await emails.orderStatusChanged(customer, line);
  }
  res.json(line);
});

// List all orders (admin only)
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('productId', 'name price image')
      .populate('customerId', 'username email')
      .populate('retailerId', 'username email')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

module.exports = router;
