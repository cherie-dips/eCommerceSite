const mongoose = require("mongoose");

const CATEGORIES = ["Drinkware", "Apparel", "Bags", "Stationery", "Tech", "Office Kits", "Other"];
const VIEWS = ["front", "back", "side"];
// Built-in 3D models, used only by the demo products. Sellers upload their own .glb model.
const BUILT_IN_MODELS = ["mug", "tshirt", "tote", "notebook", "cap", "bottle", "phonecase", "mousepad"];

// Where a side's design sits on the 3D model, in the model's own coordinates:
// a point on its surface, the surface direction there, and the design's width as a
// fraction (0-1) of the model's width.
const printSpotSchema = new mongoose.Schema({
  point:  { type: [Number], required: true },
  normal: { type: [Number], required: true },
  size:   { type: Number, min: 0.05, max: 1, required: true },
}, { _id: false });

// Where a design can be printed on a product photo.
// x, y, width, height are fractions (0-1) of the photo; widthCm is the real printed width.
const printAreaSchema = new mongoose.Schema({
  x:      { type: Number, min: 0, max: 1, required: true },
  y:      { type: Number, min: 0, max: 1, required: true },
  width:  { type: Number, min: 0.02, max: 1, required: true },
  height: { type: Number, min: 0.02, max: 1, required: true },
  widthCm: { type: Number, min: 1, max: 200, default: 20 },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  category:    { type: String, enum: CATEGORIES, default: "Other" },
  // Main (front) photo. Either a full URL or a path like "uploads/products/abc.jpg".
  image:    { type: String, required: true },
  // Extra photos for other sides, e.g. { back: "uploads/products/def.jpg" }.
  images: {
    back: String,
    side: String,
  },
  price:    { type: Number, required: true, min: 0 },
  stock:    { type: Number, min: 0, default: 100 },
  customizable: { type: Boolean, default: true },
  printAreas: {
    front: printAreaSchema,
    back:  printAreaSchema,
    side:  printAreaSchema,
  },
  // The product's 3D model: the seller's uploaded .glb file ("uploads/models/abc.glb"),
  // or a built-in model (demo products only). Every product in the store has one.
  modelFile: { type: String, default: "" },
  model3d:  { type: String, enum: ["", ...BUILT_IN_MODELS], default: "" },
  // Where the front/back designs go on the 3D model. Without one, the design is
  // placed in the middle of that side.
  modelPrintSpots: {
    front: printSpotSchema,
    back:  printSpotSchema,
  },
  active:   { type: Boolean, default: true },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  likedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  ratingAvg:   { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  soldCount:   { type: Number, default: 0 },
}, { timestamps: true });

productSchema.index({ active: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.VIEWS = VIEWS;
module.exports.BUILT_IN_MODELS = BUILT_IN_MODELS;
