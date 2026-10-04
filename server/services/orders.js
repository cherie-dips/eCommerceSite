// Order and payment steps shared by the order routes, the Razorpay webhook and the
// clean-up job.
const Order = require("../models/Order");
const Checkout = require("../models/Checkout");
const Product = require("../models/Product");
const User = require("../models/User");
const config = require("../config");
const { emails } = require("../utils/email");
const { refundPayment } = require("../utils/payments");

// Puts items back in stock (used when an order is cancelled).
async function restock(lines) {
  for (const line of lines) {
    await Product.updateOne({ _id: line.productId }, { $inc: { stock: line.quantity || 1 } });
  }
}

// Marks a whole order as paid (only once, even if called twice at the same time),
// then emails the customer and each retailer.
async function finalizePaidOrder(orderId, { razorpayPaymentId } = {}) {
  const now = new Date();
  const checkout = await Checkout.findOneAndUpdate(
    { orderId, status: "pending" },
    { status: "paid", paidAt: now, ...(razorpayPaymentId ? { razorpayPaymentId } : {}) },
    { new: true }
  );
  if (!checkout) return null; // already paid or cancelled

  await Order.updateMany(
    { orderId, status: "pending_payment" },
    { $set: { status: "paid" }, $push: { statusHistory: { status: "paid", at: now } } }
  );
  const lines = await Order.find({ orderId });
  for (const line of lines) {
    await Product.updateOne({ _id: line.productId }, { $inc: { soldCount: line.quantity } });
  }

  const customer = await User.findById(checkout.customerId);
  if (customer) await emails.orderConfirmation(customer, orderId, lines, checkout.amount);

  const byRetailer = new Map();
  for (const line of lines) {
    const key = String(line.retailerId);
    byRetailer.set(key, [...(byRetailer.get(key) || []), line]);
  }
  for (const [retailerId, retailerLines] of byRetailer) {
    const seller = await User.findById(retailerId);
    if (seller) await emails.sellerNewOrder(seller, orderId, retailerLines);
  }
  return checkout;
}

// Cancels an order that was never paid and puts its stock back.
async function cancelUnpaidOrder(orderId) {
  const checkout = await Checkout.findOneAndUpdate(
    { orderId, status: "pending" },
    { status: "cancelled" },
    { new: true }
  );
  if (!checkout) return null;
  const lines = await Order.find({ orderId, status: "pending_payment" });
  await Order.updateMany(
    { orderId, status: "pending_payment" },
    { $set: { status: "cancelled" }, $push: { statusHistory: { status: "cancelled", at: new Date() } } }
  );
  await restock(lines);
  return checkout;
}

// Refunds money for cancelled items when the payment went through Razorpay.
async function refundIfPaid(checkout, amount) {
  if (checkout.provider !== "razorpay" || !checkout.razorpayPaymentId || !config.razorpay.enabled) return false;
  await refundPayment(checkout.razorpayPaymentId, amount);
  return true;
}

// Unpaid orders older than PENDING_ORDER_MINUTES are cancelled so their stock is freed.
async function cancelStalePendingOrders() {
  const cutoff = new Date(Date.now() - config.pendingOrderMinutes * 60 * 1000);
  const stale = await Checkout.find({ status: "pending", createdAt: { $lt: cutoff } }).select("orderId");
  for (const { orderId } of stale) await cancelUnpaidOrder(orderId);
  return stale.length;
}

module.exports = { restock, finalizePaidOrder, cancelUnpaidOrder, refundIfPaid, cancelStalePendingOrders };
