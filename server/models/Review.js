const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   { type: String, trim: true, maxlength: 1000, default: "" },
}, { timestamps: true });

// One review per customer per product (posting again updates it)
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
