const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  image:    { type: String, required: true },
  price:    { type: Number, required: true },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  likedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);