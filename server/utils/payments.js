// Razorpay payments. Uses Razorpay's REST API directly (no extra package needed).
// Docs: https://razorpay.com/docs/payments/server-integration/nodejs/
const crypto = require("crypto");
const config = require("../config");

const RAZORPAY_API = "https://api.razorpay.com/v1";

// Creates a Razorpay order for the amount the customer must pay.
// amount is in rupees; Razorpay works in paise.
async function createRazorpayOrder({ amount, receipt, notes }) {
  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString("base64");
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR", receipt, notes }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Razorpay order failed: ${data?.error?.description || res.status}`);
  }
  return data; // { id: "order_...", amount, currency, ... }
}

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// Checks that a payment really came from Razorpay for this order.
function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", config.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

// Checks a webhook call really came from Razorpay.
function verifyWebhookSignature(rawBody, signature) {
  if (!config.razorpay.webhookSecret) return false;
  const expected = crypto.createHmac("sha256", config.razorpay.webhookSecret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

// Refunds a captured payment (fully, or partly when amount is given in rupees).
async function refundPayment(paymentId, amount) {
  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString("base64");
  const res = await fetch(`${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(amount ? { amount: Math.round(amount * 100) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay refund failed: ${data?.error?.description || res.status}`);
  return data;
}

module.exports = { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature, refundPayment };
