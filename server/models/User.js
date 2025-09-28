const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: function() { return !this.googleId; } },
  role:     { type: String, enum: ["user", "retailer", "admin"], default: "user" },
  googleId: { type: String, unique: true, sparse: true },
  profilePicture: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);