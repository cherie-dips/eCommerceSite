const mongoose = require("mongoose");

// The payment for one whole order (all its lines share the same orderId).
const checkoutSchema = new mongoose.Schema({
  orderId:    { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subtotal:   { type: Number, required: true },
  discount:   { type: Number, default: 0 },
  amount:     { type: Number, required: true }, // what the customer pays, in rupees
  currency:   { type: String, default: "INR" },
  discountCode: String,
  // "razorpay" for real payments, "test" when Razorpay keys are not set
  provider:   { type: String, enum: ["razorpay", "test"], required: true },
  status:     { type: String, enum: ["pending", "paid", "failed", "cancelled"], default: "pending" },
  razorpayOrderId:   { type: String, index: true },
  razorpayPaymentId: String,
  paidAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("Checkout", checkoutSchema);
