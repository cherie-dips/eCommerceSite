// Product types that have a 3D model (a product's `model3d` field). Kept apart from the
// 3D code so pages like the product form don't load three.js just to list them.
export const PRODUCT_TYPES = [
  { key: "tshirt", name: "T-shirt", category: "Apparel" },
  { key: "mug", name: "Mug", category: "Drinkware" },
  { key: "tote", name: "Tote bag", category: "Bags" },
  { key: "notebook", name: "Notebook", category: "Stationery" },
  { key: "cap", name: "Cap", category: "Apparel" },
  { key: "bottle", name: "Water bottle", category: "Drinkware" },
  { key: "phonecase", name: "Phone case", category: "Tech" },
  { key: "mousepad", name: "Mouse pad", category: "Office Kits" },
];
