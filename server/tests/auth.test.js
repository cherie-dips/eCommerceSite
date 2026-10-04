const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, stopTestServer, api, createUser, createProduct } = require("./helpers");
const { sentEmails } = require("../utils/email");

before(startTestServer);
after(stopTestServer);

const linkToken = (email) => /token=([a-f0-9]+)/.exec(email.text)[1];

test("sign-up can't create an admin, and duplicate emails get a clear message", async () => {
  let r = await api("POST", "/api/auth/register", { body: { username: "eve", email: "Eve@Test.com", password: "pw123456", role: "admin" } });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, "user");

  r = await api("POST", "/api/auth/register", { body: { username: "eve2", email: "eve@test.com", password: "pw123456" } });
  assert.equal(r.status, 409);
  assert.match(r.data.error, /already exists/);

  r = await api("POST", "/api/auth/register", { body: { username: "x", email: "x@test.com", password: "123" } });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /at least 6/);
});

test("login works with any capitalisation of the email; wrong password is 401", async () => {
  let r = await api("POST", "/api/auth/login", { body: { email: "EVE@test.com", password: "pw123456" } });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.role, "user");
  assert.ok(r.data.token);

  r = await api("POST", "/api/auth/login", { body: { email: "eve@test.com", password: "nope" } });
  assert.equal(r.status, 401);
});

test("email confirmation link works", async () => {
  const email = sentEmails.find((e) => e.to === "eve@test.com" && /Confirm/.test(e.subject));
  assert.ok(email, "confirmation email was sent");
  const r = await api("POST", "/api/auth/verify-email", { body: { token: linkToken(email) } });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.emailVerified, true);
});

test("forgot password -> reset link -> new password works, link works only once", async () => {
  let r = await api("POST", "/api/auth/forgot-password", { body: { email: "nobody@test.com" } });
  assert.equal(r.status, 200); // same answer for unknown emails

  r = await api("POST", "/api/auth/forgot-password", { body: { email: "eve@test.com" } });
  assert.equal(r.status, 200);
  const email = sentEmails.findLast((e) => e.to === "eve@test.com" && /Reset/.test(e.subject));
  const token = linkToken(email);

  r = await api("POST", "/api/auth/reset-password", { body: { token, password: "newpass99" } });
  assert.equal(r.status, 200);
  r = await api("POST", "/api/auth/reset-password", { body: { token, password: "another99" } });
  assert.equal(r.status, 400);

  r = await api("POST", "/api/auth/login", { body: { email: "eve@test.com", password: "newpass99" } });
  assert.equal(r.status, 200);
});

test("new sellers wait for approval before listing products", async () => {
  let r = await api("POST", "/api/retailer/register", { body: { username: "shop", email: "shop@test.com", password: "pw123456" } });
  assert.equal(r.status, 201);
  r = await api("POST", "/api/retailer/login", { body: { email: "shop@test.com", password: "pw123456" } });
  assert.equal(r.data.user.role, "retailer");
  assert.equal(r.data.user.approved, false);
  const sellerToken = r.data.token;

  const product = { name: "Mug", price: 100, image: "uploads/products/a.jpg" };
  r = await api("POST", "/api/products", { body: product, token: sellerToken });
  assert.equal(r.status, 403);
  assert.match(r.data.error, /approval/);

  const { token: adminToken } = await createUser({ role: "admin" });
  const pending = await api("GET", "/api/admin/users?pending=true", { token: adminToken });
  const shop = pending.data.find((u) => u.email === "shop@test.com");
  r = await api("PATCH", `/api/admin/users/${shop._id}`, { body: { approved: true }, token: adminToken });
  assert.equal(r.data.approved, true);

  r = await api("POST", "/api/products", { body: product, token: sellerToken });
  assert.equal(r.status, 201);
});

test("expired or fake logins get 401; wrong role gets 403", async () => {
  const jwt = require("jsonwebtoken");
  const expired = jwt.sign({ id: "000000000000000000000000", role: "user", exp: Math.floor(Date.now() / 1000) - 10 }, "test-secret");
  let r = await api("GET", "/api/orders/customer", { token: expired });
  assert.equal(r.status, 401);
  r = await api("GET", "/api/orders/customer", { token: "garbage" });
  assert.equal(r.status, 401);

  const { token } = await createUser();
  r = await api("GET", "/api/orders", { token });
  assert.equal(r.status, 403);
  r = await api("GET", "/api/orders");
  assert.equal(r.status, 401);
});

test("profile: change name, password and saved addresses", async () => {
  const { token, password } = await createUser();
  let r = await api("PUT", "/api/users/me", { body: { username: "New Name" }, token });
  assert.equal(r.data.user.username, "New Name");

  r = await api("PUT", "/api/users/me/password", { body: { currentPassword: "wrong", newPassword: "abcdef12" }, token });
  assert.equal(r.status, 400);
  r = await api("PUT", "/api/users/me/password", { body: { currentPassword: password, newPassword: "abcdef12" }, token });
  assert.equal(r.status, 200);

  r = await api("POST", "/api/users/me/addresses", { body: { line: "1 MG Road", pincode: "411001", phone: "9999999999" }, token });
  assert.equal(r.status, 201);
  assert.equal(r.data.addresses[0].isDefault, true);
  r = await api("POST", "/api/users/me/addresses", { body: { line: "2 FC Road", pincode: "411004", isDefault: true }, token });
  assert.deepEqual(r.data.addresses.map((a) => a.isDefault), [false, true]);
  r = await api("DELETE", `/api/users/me/addresses/${r.data.address._id}`, { token });
  assert.equal(r.data.addresses.length, 1);
  assert.equal(r.data.addresses[0].isDefault, true);
});

test("admin can hide a product from the store", async () => {
  const { user: seller } = await createUser({ role: "retailer" });
  const product = await createProduct(seller, { name: "Hide me" });
  const { token: adminToken } = await createUser({ role: "admin" });
  let r = await api("PATCH", `/api/admin/products/${product._id}`, { body: { active: false }, token: adminToken });
  assert.equal(r.data.active, false);
  r = await api("GET", `/api/products/${product._id}`);
  assert.equal(r.status, 404);
  r = await api("GET", "/api/admin/stats", { token: adminToken });
  assert.equal(typeof r.data.revenue, "number");
});
