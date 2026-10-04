const mongoose = require("mongoose");

// A customer's design for one product: the editable layers for each side, plus
// a preview picture and a print-ready file per side.
const designViewSchema = new mongoose.Schema({
  view: { type: String, required: true },           // "front", "back", "side" or "3d"
  layers: { type: mongoose.Schema.Types.Mixed, default: [] },
  previewPath: String,                               // product photo with the design on it
  printPath: String,                                 // design only, transparent, high resolution
}, { _id: false });

const designSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  mode:      { type: String, enum: ["2d", "3d"], default: "2d" },
  name:      { type: String, trim: true, maxlength: 80, default: "My design" },
  views:     [designViewSchema],
  previewPath: String,                               // main preview (first side)
  assets:    [String],                               // uploaded photos/logos used in the design
  meta:      { type: mongoose.Schema.Types.Mixed },  // extra details (e.g. 3D colour)
}, { timestamps: true });

module.exports = mongoose.model("Design", designSchema);
