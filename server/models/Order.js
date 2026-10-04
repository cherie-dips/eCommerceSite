// models/Order.js
const mongoose = require("mongoose");

// Fulfilment steps a retailer moves an order line through.
// "sent_to_delivery" is kept only so orders saved by older versions still load.
const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "sent_to_delivery",
];

// One document per product line. All lines from the same checkout share the same orderId
// (the matching Checkout document holds the payment for the whole order).
const OrderSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: String, index: true },
  // Customer's design (if the product was customised)
  designId: { type: mongoose.Schema.Types.ObjectId, ref: "Design" },
  // Picture of the customised product (shown to the retailer and the customer)
  imagePath: String,
  // Print-ready files, one per side of the product
  printFiles: [{ view: String, path: String, _id: false }],
  productName: String,
  quantity: { type: Number, min: 1, default: 1 },
  // Price per item that the customer actually paid (after any discount).
  unitPrice: { type: Number, min: 0 },
  discountCode: String,
  paymentMethod: String,
  address: {
    name: String,
    phone: String,
    line: String,
    city: String,
    state: String,
    pincode: String,
  },
  status: {
    type: String,
    enum: ORDER_STATUSES,
    default: "paid",
  },
  statusHistory: [{ status: String, at: { type: Date, default: Date.now }, _id: false }],
  courier: String,
  deliveryService: {
    type: String,
  },
  trackingId: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

OrderSchema.index({ retailerId: 1, createdAt: -1 });
OrderSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
