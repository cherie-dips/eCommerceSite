const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { startTestServer, stopTestServer, api, createUser, createProduct, pngBlob, config } = require("./helpers");
const Product = require("../models/Product");
const Checkout = require("../models/Checkout");
const { cancelStalePendingOrders } = require("../services/orders");
const { sentEmails } = require("../utils/email");

before(startTestServer);
after(stopTestServer);

const ADDRESS = { name: "Eve", phone: "9999999999", line: "12 MG Road", city: "Pune", pincode: "411001" };

let seller, sellerToken, customer, customerToken, mug, tee;

beforeEach(async () => {
  config.razorpay.enabled = false;
});

test("setup", async () => {
  ({ user: seller, token: sellerToken } = await createUser({ role: "retailer" }));
  ({ user: customer, token: customerToken } = await createUser());
  mug = await createProduct(seller, { name: "Mug", price: 500, stock: 10 });
  tee = await createProduct(seller, { name: "Tee", price: 300, stock: 2 });
});

// Saves a design with one uploaded logo, one preview and one print file.
async function saveDesign(token, productId, layers) {
  const form = new FormData();
  form.append("data", JSON.stringify({ productId, mode: "2d", views: [{ view: "front", layers }] }));
  form.append("assets", pngBlob(), "logo.png");
  form.append("previews", pngBlob(), "preview.png");
  form.append("prints", pngBlob(), "print.png");
  return api("POST", "/api/designs", { form, token });
}

let design;

test("saving a design stores the files and keeps only safe layer settings", async () => {
  const r = await saveDesign(customerToken, mug._id, [
    { type: "image", src: "asset:0", x: 500, y: 300, width: 400, height: 400, rotation: 10 },
    { type: "image", src: "https://evil.example/tracker.png", x: 1, y: 1, width: 10, height: 10 },
    { type: "text", text: "Hello", x: 500, y: 600, width: 600, height: 80, fontSize: 70, fill: "javascript:bad", onclick: "x" },
    { type: "script", x: 1 },
  ]);
  assert.equal(r.status, 201);
  design = r.data;
  const layers = design.views[0].layers;
  assert.equal(layers.length, 2); // outside image and unknown layer type dropped
  assert.match(layers[0].src, /^uploads\/designs\//);
  assert.equal(layers[1].fill, "#111111"); // bad colour replaced
  assert.equal(layers[1].onclick, undefined);
  assert.ok(design.previewPath && design.views[0].printPath);

  const mine = await api("GET", "/api/designs/mine", { token: customerToken });
  assert.equal(mine.data.length, 1);
  const { token: stranger } = await createUser();
  assert.equal((await api("GET", `/api/designs/${design._id}`, { token: stranger })).status, 404);
});

test("design needs a preview and print file for each side", async () => {
  const form = new FormData();
  form.append("data", JSON.stringify({ productId: mug._id, views: [{ view: "front", layers: [] }] }));
  const r = await api("POST", "/api/designs", { form, token: customerToken });
  assert.equal(r.status, 400);
});

let orderId;

test("test-mode checkout: one order, prices from the database, discount, stock reserved", async () => {
  const r = await api("POST", "/api/orders", {
    token: customerToken,
    body: {
      items: [
        { productId: mug._id, quantity: 3, designId: design._id },
        { productId: tee._id, quantity: 2 },
      ],
      address: ADDRESS,
      discountCode: "save10",
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.payment.provider, "test");
  assert.equal(r.data.amount, 3 * 450 + 2 * 270);
  orderId = r.data.orderId;

  assert.equal((await Product.findById(mug._id)).stock, 7);
  assert.equal((await Product.findById(tee._id)).stock, 0);
  assert.equal((await Product.findById(mug._id)).soldCount, 3);
  assert.ok(sentEmails.some((e) => e.to === customer.email && e.subject.includes(orderId)));
  assert.ok(sentEmails.some((e) => e.to === seller.email && e.subject.includes("New order")));
});

test("out of stock and bad orders are refused without taking any stock", async () => {
  let r = await api("POST", "/api/orders", {
    token: customerToken,
    body: { items: [{ productId: mug._id, quantity: 1 }, { productId: tee._id, quantity: 1 }], address: ADDRESS },
  });
  assert.equal(r.status, 409);
  assert.match(r.data.error, /Tee is out of stock/);
  assert.equal((await Product.findById(mug._id)).stock, 7); // mug stock was given back

  r = await api("POST", "/api/orders", { token: customerToken, body: { items: [{ productId: mug._id, quantity: 1 }], address: { line: "x" } } });
  assert.match(r.data.error, /address/);
  r = await api("POST", "/api/orders", { token: customerToken, body: { items: [{ productId: mug._id, quantity: 1 }], address: ADDRESS, discountCode: "FREE" } });
  assert.match(r.data.error, /discount/);

  const { token: other } = await createUser();
  r = await api("POST", "/api/orders", { token: other, body: { items: [{ productId: mug._id, quantity: 1, designId: design._id }], address: ADDRESS } });
  assert.equal(r.status, 400); // someone else's design
});

test("customer sees the order grouped with its lines", async () => {
  const r = await api("GET", "/api/orders/customer", { token: customerToken });
  const order = r.data.find((o) => o.orderId === orderId);
  assert.equal(order.lines.length, 2);
  assert.equal(order.paymentStatus, "paid");
  assert.equal(order.amount, 1890);
});

test("retailer gets print files and moves the order through its steps", async () => {
  let r = await api("GET", "/api/orders/retailer", { token: sellerToken });
  const line = r.data.find((l) => l.orderId === orderId && l.designId);
  assert.equal(line.printFiles.length, 1);
  assert.equal((await api("GET", `/${line.printFiles[0].path}`)).status, 200);

  r = await api("PATCH", `/api/orders/lines/${line._id}`, { body: { status: "delivered" }, token: sellerToken });
  assert.equal(r.status, 400); // can't skip shipping
  r = await api("PATCH", `/api/orders/lines/${line._id}`, { body: { status: "shipped" }, token: sellerToken });
  assert.match(r.data.error, /tracking/);
  r = await api("PATCH", `/api/orders/lines/${line._id}`, { body: { status: "shipped", courier: "Delhivery", trackingId: "DL123" }, token: sellerToken });
  assert.equal(r.data.status, "shipped");
  assert.ok(sentEmails.some((e) => e.to === customer.email && /shipped/.test(e.subject)));

  const { token: otherSeller } = await createUser({ role: "retailer" });
  r = await api("PATCH", `/api/orders/lines/${line._id}`, { body: { status: "delivered" }, token: otherSeller });
  assert.equal(r.status, 404);

  // The retailer of the order can open the design
  assert.equal((await api("GET", `/api/designs/${design._id}`, { token: sellerToken })).status, 200);
});

test("customer can't cancel once the seller has started; can cancel a fresh order", async () => {
  let r = await api("POST", `/api/orders/${orderId}/cancel`, { token: customerToken });
  assert.equal(r.status, 400);

  r = await api("POST", "/api/orders", { token: customerToken, body: { items: [{ productId: mug._id, quantity: 2 }], address: ADDRESS } });
  assert.equal((await Product.findById(mug._id)).stock, 5);
  r = await api("POST", `/api/orders/${r.data.orderId}/cancel`, { token: customerToken });
  assert.equal(r.status, 200);
  assert.equal((await Product.findById(mug._id)).stock, 7);
});

// ---- Razorpay (with Razorpay's API replaced by a fake) ----
function fakeRazorpay() {
  const calls = [];
  const realFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (String(url).startsWith("https://api.razorpay.com")) {
      calls.push({ url: String(url), body: JSON.parse(options.body || "{}") });
      const body = String(url).endsWith("/orders")
        ? { id: `order_${crypto.randomUUID()}`, amount: calls.at(-1).body.amount, currency: "INR" }
        : { id: "rfnd_1" };
      return new Response(JSON.stringify(body), { status: 200 });
    }
    return realFetch(url, options);
  };
  return { calls, restore: () => (global.fetch = realFetch) };
}

test("Razorpay: order waits for payment, a valid signature marks it paid", async () => {
  Object.assign(config.razorpay, { enabled: true, keyId: "rzp_test_x", keySecret: "shh", webhookSecret: "hook" });
  const fake = fakeRazorpay();
  try {
    let r = await api("POST", "/api/orders", { token: customerToken, body: { items: [{ productId: mug._id, quantity: 1 }], address: ADDRESS } });
    assert.equal(r.data.payment.provider, "razorpay");
    assert.equal(r.data.payment.amount, 50000); // paise
    const { orderId: id, payment } = r.data;

    r = await api("GET", "/api/orders/retailer", { token: sellerToken });
    assert.ok(!r.data.some((l) => l.orderId === id)); // unpaid orders hidden from sellers

    r = await api("POST", `/api/orders/${id}/verify-payment`, {
      token: customerToken,
      body: { razorpay_order_id: payment.razorpayOrderId, razorpay_payment_id: "pay_1", razorpay_signature: "forged" },
    });
    assert.equal(r.status, 400);

    const signature = crypto.createHmac("sha256", "shh").update(`${payment.razorpayOrderId}|pay_1`).digest("hex");
    r = await api("POST", `/api/orders/${id}/verify-payment`, {
      token: customerToken,
      body: { razorpay_order_id: payment.razorpayOrderId, razorpay_payment_id: "pay_1", razorpay_signature: signature },
    });
    assert.equal(r.data.status, "paid");
    assert.equal((await Checkout.findOne({ orderId: id })).razorpayPaymentId, "pay_1");

    // Cancelling a paid Razorpay order refunds it
    r = await api("POST", `/api/orders/${id}/cancel`, { token: customerToken });
    assert.equal(r.status, 200);
    assert.ok(fake.calls.some((c) => c.url.endsWith("/payments/pay_1/refund") && c.body.amount === 50000));
  } finally {
    fake.restore();
  }
});

test("Razorpay webhook marks an order paid even if the browser never confirmed it", async () => {
  Object.assign(config.razorpay, { enabled: true, keyId: "rzp_test_x", keySecret: "shh", webhookSecret: "hook" });
  const fake = fakeRazorpay();
  try {
    const r = await api("POST", "/api/orders", { token: customerToken, body: { items: [{ productId: mug._id, quantity: 1 }], address: ADDRESS } });
    const { orderId: id, payment } = r.data;
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_hook", order_id: payment.razorpayOrderId } } } });

    let w = await api("POST", "/api/payments/razorpay/webhook", { headers: { "x-razorpay-signature": "bad", "Content-Type": "application/json" }, form: body });
    assert.equal(w.status, 400);
    const sig = crypto.createHmac("sha256", "hook").update(body).digest("hex");
    w = await api("POST", "/api/payments/razorpay/webhook", { headers: { "x-razorpay-signature": sig, "Content-Type": "application/json" }, form: body });
    assert.equal(w.status, 200);
    assert.equal((await Checkout.findOne({ orderId: id })).status, "paid");
  } finally {
    fake.restore();
  }
});

test("unpaid orders are cancelled after the time limit and their stock comes back", async () => {
  Object.assign(config.razorpay, { enabled: true, keyId: "rzp_test_x", keySecret: "shh" });
  const fake = fakeRazorpay();
  try {
    const before = (await Product.findById(mug._id)).stock;
    const r = await api("POST", "/api/orders", { token: customerToken, body: { items: [{ productId: mug._id, quantity: 2 }], address: ADDRESS } });
    assert.equal((await Product.findById(mug._id)).stock, before - 2);
    // Pretend the order was placed 3 hours ago (written directly, as createdAt can't normally change)
    await Checkout.collection.updateOne({ orderId: r.data.orderId }, { $set: { createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) } });
    assert.equal(await cancelStalePendingOrders(), 1);
    assert.equal((await Product.findById(mug._id)).stock, before);
  } finally {
    fake.restore();
  }
});
