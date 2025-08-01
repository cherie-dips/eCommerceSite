// models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  productId: String,
  customerId: String,
  orderId: String,
  imagePath: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", OrderSchema);