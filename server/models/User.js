const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  label:   { type: String, trim: true, maxlength: 40, default: "Home" },
  name:    { type: String, trim: true, maxlength: 80 },
  phone:   { type: String, trim: true, maxlength: 20 },
  line:    { type: String, trim: true, maxlength: 300, required: true },
  city:    { type: String, trim: true, maxlength: 80 },
  state:   { type: String, trim: true, maxlength: 80 },
  pincode: { type: String, trim: true, maxlength: 12, required: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: function() { return !this.googleId; } },
  role:     { type: String, enum: ["user", "retailer", "admin"], default: "user" },
  // New retailers must be approved by an admin before they can list products.
  // Older accounts without this field count as approved.
  approved: { type: Boolean, default: true },
  googleId: { type: String, unique: true, sparse: true },
  profilePicture: { type: String },
  emailVerified: { type: Boolean, default: false },
  emailVerifyTokenHash: { type: String, select: false },
  emailVerifyExpires:   { type: Date, select: false },
  resetTokenHash: { type: String, select: false },
  resetExpires:   { type: Date, select: false },
  addresses: [addressSchema],
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
