const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, stopTestServer, api, createUser, createProduct, pngBlob } = require("./helpers");
const Order = require("../models/Order");

before(startTestServer);
after(stopTestServer);

let seller;
let sellerToken;

test("retailer uploads a photo and creates a product with print areas", async () => {
  ({ user: seller, token: sellerToken } = await createUser({ role: "retailer" }));

  const form = new FormData();
  form.append("image", pngBlob(), "photo.png");
  let r = await api("POST", "/api/products/upload-image", { form, token: sellerToken });
  assert.equal(r.status, 201);
  assert.match(r.data.path, /^uploads\/products\/[\w-]+\.png$/);
  const img = await api("GET", `/${r.data.path}`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("x-content-type-options"), "nosniff");

  r = await api("POST", "/api/products", {
    token: sellerToken,
    body: {
      name: "Branded Mug",
      description: "Nice mug",
      category: "Drinkware",
      price: 499,
      stock: 5,
      image: r.data.path,
      model3d: "mug",
      printAreas: { front: { x: 0.9, y: 0.2, width: 0.5, height: 0.5, widthCm: 9 } },
    },
  });
  assert.equal(r.status, 201);
  // A print area sticking out of the photo is pulled back inside it
  assert.equal(r.data.printAreas.front.x, 0.5);
  assert.equal(r.data.model3d, "mug");
});

test("uploads must be real images", async () => {
  const form = new FormData();
  form.append("image", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "fake.png");
  const r = await api("POST", "/api/products/upload-image", { form, token: sellerToken });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /not a valid image/);
});

test("search, filter, sort and pages", async () => {
  await createProduct(seller, { name: "Blue Tee", category: "Apparel", price: 700 });
  await createProduct(seller, { name: "Red Tee", category: "Apparel", price: 300 });
  await createProduct(seller, { name: "Notebook", category: "Stationery", price: 200 });

  let r = await api("GET", "/api/products?category=Apparel&sort=price_asc");
  assert.deepEqual(r.data.products.map((p) => p.name), ["Red Tee", "Blue Tee"]);

  r = await api("GET", "/api/products?search=tee");
  assert.equal(r.data.total, 2);

  r = await api("GET", "/api/products?limit=2&page=2&sort=price_desc");
  assert.equal(r.data.pages, 2);
  assert.equal(r.data.products.length, 2);

  r = await api("GET", "/api/products?search=" + encodeURIComponent("(.*"));
  assert.equal(r.status, 200); // odd characters don't break the search
});

test("only the owner can edit or remove a product; removed products disappear", async () => {
  const product = await createProduct(seller, { name: "Editable" });
  const { token: otherSeller } = await createUser({ role: "retailer" });

  let r = await api("PUT", `/api/products/${product._id}`, { body: { price: 1 }, token: otherSeller });
  assert.equal(r.status, 403);
  r = await api("PUT", `/api/products/${product._id}`, { body: { price: 650, stock: 3 }, token: sellerToken });
  assert.equal(r.data.price, 650);
  assert.equal(r.data.stock, 3);

  r = await api("DELETE", `/api/products/${product._id}`, { token: sellerToken });
  assert.equal(r.status, 200);
  r = await api("GET", `/api/products/${product._id}`);
  assert.equal(r.status, 404);
  r = await api("GET", "/api/retailer-products", { token: sellerToken });
  assert.ok(r.data.some((p) => p.name === "Editable" && p.active === false));
});

test("bad product links give 404", async () => {
  assert.equal((await api("GET", "/api/products/not-an-id")).status, 404);
  assert.equal((await api("GET", "/api/products/64b000000000000000000000")).status, 404);
});

test("reviews: only buyers can review, and the average rating updates", async () => {
  const product = await createProduct(seller, { name: "Reviewed" });
  const { user: buyer, token: buyerToken } = await createUser();
  const { token: strangerToken } = await createUser();

  let r = await api("POST", `/api/products/${product._id}/reviews`, { body: { rating: 5 }, token: strangerToken });
  assert.equal(r.status, 403);

  await Order.create({ productId: product._id, customerId: buyer._id, retailerId: seller._id, quantity: 1, unitPrice: 500, status: "delivered" });
  r = await api("POST", `/api/products/${product._id}/reviews`, { body: { rating: 4, comment: "Great print" }, token: buyerToken });
  assert.equal(r.status, 201);
  r = await api("POST", `/api/products/${product._id}/reviews`, { body: { rating: 2 }, token: buyerToken });
  assert.equal(r.data.ratingAvg, 2); // posting again updates the same review
  assert.equal(r.data.ratingCount, 1);

  r = await api("GET", `/api/products/${product._id}/reviews`);
  assert.equal(r.data.length, 1);
});
