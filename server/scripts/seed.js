// Adds a demo seller and ready-to-customise demo products (mug, tote, T-shirt, notebook).
// Safe to run more than once: existing demo products are left as they are.
//   npm run seed
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const config = require("../config");
const User = require("../models/User");
const Product = require("../models/Product");
const { UPLOAD_DIRS } = require("../utils/uploads");

const SELLER_EMAIL = process.env.SEED_SELLER_EMAIL || "demo-seller@flagzen.local";

const PRODUCTS = [
  {
    name: "Classic White Mug",
    category: "Drinkware",
    price: 499,
    stock: 200,
    description: "Glossy 330 ml ceramic mug, dishwasher and microwave safe. Your design is printed on the front.",
    image: "mug.jpg",
    model3d: "mug",
    printAreas: { front: { x: 0.31, y: 0.31, width: 0.33, height: 0.38, widthCm: 9.5 } },
  },
  {
    name: "Organic Cotton Tote Bag",
    category: "Bags",
    price: 549,
    stock: 150,
    description: "Sturdy natural-cotton tote with long handles. Great for events and onboarding kits.",
    image: "tote.jpg",
    printAreas: { front: { x: 0.32, y: 0.4, width: 0.36, height: 0.4, widthCm: 28 } },
  },
  {
    name: "Classic Cotton T-Shirt",
    category: "Apparel",
    price: 699,
    stock: 300,
    description: "Soft 180 GSM cotton crew-neck tee. Print on the front, the back, or both.",
    image: "tshirt-front.jpg",
    images: { back: "tshirt-back.jpg" },
    printAreas: {
      front: { x: 0.35, y: 0.27, width: 0.3, height: 0.38, widthCm: 30 },
      back: { x: 0.35, y: 0.24, width: 0.3, height: 0.42, widthCm: 30 },
    },
  },
  {
    name: "Kraft Hardcover Notebook",
    category: "Stationery",
    price: 349,
    stock: 250,
    description: "A5 hardcover notebook with a kraft cover, 160 ruled pages and an elastic band.",
    image: "notebook.jpg",
    printAreas: { front: { x: 0.36, y: 0.3, width: 0.28, height: 0.36, widthCm: 10 } },
  },
];

// Copies a template photo into uploads/products and returns its public path.
function copyAsset(file) {
  fs.mkdirSync(UPLOAD_DIRS.products, { recursive: true });
  const target = path.join(UPLOAD_DIRS.products, `seed-${file}`);
  if (!fs.existsSync(target)) fs.copyFileSync(path.join(__dirname, "..", "seed-assets", file), target);
  return `uploads/products/seed-${file}`;
}

async function main() {
  await mongoose.connect(config.mongoUri);

  let seller = await User.findOne({ email: SELLER_EMAIL });
  if (!seller) {
    const password = process.env.SEED_SELLER_PASSWORD || crypto.randomBytes(6).toString("hex");
    seller = await new User({
      username: "Flagzen Studio",
      email: SELLER_EMAIL,
      password: await bcrypt.hash(password, 10),
      role: "retailer",
      approved: true,
      emailVerified: true,
    }).save();
    console.log(`Created demo seller: ${SELLER_EMAIL} / password: ${password}`);
  } else {
    console.log(`Demo seller already exists: ${SELLER_EMAIL}`);
  }

  for (const p of PRODUCTS) {
    if (await Product.exists({ name: p.name, retailerId: seller._id })) {
      console.log(`- ${p.name}: already there`);
      continue;
    }
    await new Product({
      ...p,
      image: copyAsset(p.image),
      images: p.images ? { back: copyAsset(p.images.back) } : undefined,
      customizable: true,
      retailerId: seller._id,
    }).save();
    console.log(`- ${p.name}: added`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
