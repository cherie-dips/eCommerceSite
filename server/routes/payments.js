// Razorpay webhook: Razorpay calls this when a payment completes, so an order is marked
// paid even if the customer closes the browser before the website confirms it.
// Set it up in the Razorpay dashboard -> Webhooks with the URL
//   https://<your-server>/api/payments/razorpay/webhook
// and the events "payment.captured" and "order.paid". Put the secret in RAZORPAY_WEBHOOK_SECRET.
const express = require("express");
const Checkout = require("../models/Checkout");
const { verifyWebhookSignature, refundPayment } = require("../utils/payments");
const { finalizePaidOrder } = require("../services/orders");

const router = express.Router();

// Needs the raw request body to check Razorpay's signature.
router.post("/razorpay/webhook", express.raw({ type: "*/*", limit: "1mb" }), async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid body" });
  }

  const payment = event?.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id || event?.payload?.order?.entity?.id;
  if (!["payment.captured", "order.paid"].includes(event?.event) || !razorpayOrderId) {
    return res.json({ ignored: true });
  }

  const checkout = await Checkout.findOne({ razorpayOrderId });
  if (!checkout) return res.json({ ignored: true });

  if (checkout.status === "cancelled" && payment?.id) {
    // Paid after the order expired: give the money back.
    await refundPayment(payment.id).catch((err) => console.error("Refund failed:", err.message));
    return res.json({ refunded: true });
  }
  await finalizePaidOrder(checkout.orderId, { razorpayPaymentId: payment?.id });
  res.json({ ok: true });
});

module.exports = router;
