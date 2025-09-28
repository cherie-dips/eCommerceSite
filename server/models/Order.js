// models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: String,
  imagePath: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", OrderSchema);