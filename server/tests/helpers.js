// Shared test setup: a throw-away MongoDB, a temporary upload folder and the app
// listening on a random port. Optional services are switched off unless a test turns them on.
const os = require("os");
const fs = require("fs");
const path = require("path");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "flagzen-test-uploads-"));
for (const key of ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "ANTHROPIC_API_KEY", "SMTP_HOST", "GOOGLE_CLIENT_ID"]) {
  process.env[key] = "";
}

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("../config");
const User = require("../models/User");
const Product = require("../models/Product");
const { signToken } = require("../utils/tokens");

let mongo;
let server;
let baseUrl;

async function startTestServer() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const app = require("../app");
  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return baseUrl;
}

async function stopTestServer() {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
}

// Calls the API. body = JSON, form = FormData.
async function api(method, urlPath, { body, form, token, headers = {} } = {}) {
  const res = await fetch(baseUrl + urlPath, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

let counter = 0;
async function createUser({ role = "user", approved = true, password = "secret123", email } = {}) {
  counter += 1;
  const user = await new User({
    username: `${role}${counter}`,
    email: email || `${role}${counter}@test.com`,
    password: await bcrypt.hash(password, 4),
    role,
    approved,
    emailVerified: true,
  }).save();
  return { user, token: signToken(user), password };
}

async function createProduct(retailer, overrides = {}) {
  return new Product({
    name: "Test Mug",
    category: "Drinkware",
    image: "uploads/products/test.jpg",
    price: 500,
    stock: 10,
    printAreas: { front: { x: 0.3, y: 0.3, width: 0.4, height: 0.4, widthCm: 10 } },
    retailerId: retailer._id,
    ...overrides,
  }).save();
}

// Smallest valid PNG / JPEG files
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const pngBlob = () => new Blob([PNG], { type: "image/png" });

module.exports = { startTestServer, stopTestServer, api, createUser, createProduct, pngBlob, PNG, config };
