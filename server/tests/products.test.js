const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, stopTestServer, api, createUser, createProduct, pngBlob, glbBlob } = require("./helpers");
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

test("only products with a 3D model are listed, and new products need one", async () => {
  await createProduct(seller, { name: "Old Phone", category: "Tech", model3d: "" });
  let r = await api("GET", "/api/products?search=old%20phone");
  assert.equal(r.data.total, 0);

  r = await api("POST", "/api/products", {
    token: sellerToken,
    body: { name: "No Model", price: 100, image: "uploads/products/test.jpg" },
  });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /3D model/);
});

// Uploads a .glb (or any file) as the seller and returns the response
const uploadModel = (blob, name = "model.glb") => {
  const form = new FormData();
  form.append("model", blob, name);
  return api("POST", "/api/products/upload-model", { form, token: sellerToken });
};

test("sellers upload a .glb model; anything else is refused", async () => {
  let r = await uploadModel(glbBlob());
  assert.equal(r.status, 201);
  assert.match(r.data.path, /^uploads\/models\/[\w-]+\.glb$/);
  const file = await api("GET", `/${r.data.path}`);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("content-type"), "model/gltf-binary");

  r = await uploadModel(pngBlob(), "photo.glb"); // a picture renamed to .glb
  assert.equal(r.status, 400);
  assert.match(r.data.error, /not a \.glb/);

  r = await uploadModel(glbBlob(), "model.obj");
  assert.equal(r.status, 400);
  assert.match(r.data.error, /\.glb file/);

  r = await uploadModel(glbBlob({ asset: { version: "2.0" }, meshes: [] }));
  assert.equal(r.status, 400);
  assert.match(r.data.error, /no shapes/);

  r = await uploadModel(glbBlob({ asset: { version: "2.0" }, meshes: [{}], images: [{ uri: "texture.png" }] }));
  assert.equal(r.status, 400);
  assert.match(r.data.error, /single \.glb/);

  const { token: customerToken } = await createUser();
  const form = new FormData();
  form.append("model", glbBlob(), "model.glb");
  r = await api("POST", "/api/products/upload-model", { form, token: customerToken });
  assert.equal(r.status, 403); // customers can't upload models
});

test("a product with an uploaded model is saved with its print spots and listed", async () => {
  const model = (await uploadModel(glbBlob())).data.path;
  let r = await api("POST", "/api/products", {
    token: sellerToken,
    body: {
      name: "Seller Hoodie",
      category: "Apparel",
      price: 999,
      image: "uploads/products/test.jpg",
      modelFile: model,
      modelPrintSpots: { front: { point: [0, 0.3, 0.1], normal: [0, 0, 2], size: 0.4 }, back: { point: [1, 2], normal: [0, 0, -1] } },
    },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.modelFile, model);
  assert.deepEqual(r.data.modelPrintSpots.front, { point: [0, 0.3, 0.1], normal: [0, 0, 1], size: 0.4 });
  assert.equal(r.data.modelPrintSpots.back, undefined); // the invalid spot was dropped
  const id = r.data._id;

  r = await api("GET", "/api/products?search=seller%20hoodie");
  assert.equal(r.data.total, 1);

  // A model path that wasn't uploaded here is refused
  r = await api("POST", "/api/products", {
    token: sellerToken,
    body: { name: "Fake", price: 1, image: "uploads/products/test.jpg", modelFile: "uploads/models/missing.glb" },
  });
  assert.equal(r.status, 400);

  // A new model clears the old print spots; the model can't be removed altogether
  const newModel = (await uploadModel(glbBlob())).data.path;
  r = await api("PUT", `/api/products/${id}`, { token: sellerToken, body: { modelFile: newModel } });
  assert.equal(r.status, 200);
  assert.equal(r.data.modelFile, newModel);
  assert.equal(r.data.modelPrintSpots?.front, undefined);

  r = await api("PUT", `/api/products/${id}`, { token: sellerToken, body: { modelFile: "" } });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /3D model/);
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
