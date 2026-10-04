// The logged-in user's own profile, password and saved addresses.
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { verifyToken } = require("../middleware/authMiddleware");
const { publicUser } = require("../utils/tokens");
const { registrationErrorMessage } = require("../utils/authErrors");
const { MIN_PASSWORD_LENGTH } = require("./authHandlers");

const router = express.Router();
router.use(verifyToken);

const loadUser = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) res.status(401).json("You are not authenticated");
  return user;
};

router.get("/me", async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  res.json({ user: publicUser(user), addresses: user.addresses });
});

router.put("/me", async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  const username = String(req.body?.username || "").trim();
  if (!username) return res.status(400).json({ error: "Name can't be empty." });
  user.username = username.slice(0, 60);
  try {
    await user.save();
  } catch (err) {
    const message = registrationErrorMessage(err);
    if (message) return res.status(409).json({ error: message });
    throw err;
  }
  res.json({ user: publicUser(user) });
});

router.put("/me/password", async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  // Google-only accounts have no password yet; they can set one without the current one.
  if (user.password) {
    const ok = await bcrypt.compare(String(currentPassword || ""), user.password);
    if (!ok) return res.status(400).json({ error: "Your current password is wrong." });
  }
  user.password = await bcrypt.hash(String(newPassword), 10);
  await user.save();
  res.json({ message: "Password changed." });
});

// === Saved addresses ===
const cleanAddress = (body = {}) => ({
  label: String(body.label || "Home").trim().slice(0, 40),
  name: String(body.name || "").trim().slice(0, 80),
  phone: String(body.phone || "").trim().slice(0, 20),
  line: String(body.line || "").trim().slice(0, 300),
  city: String(body.city || "").trim().slice(0, 80),
  state: String(body.state || "").trim().slice(0, 80),
  pincode: String(body.pincode || "").trim().slice(0, 12),
  isDefault: Boolean(body.isDefault),
});

const validAddress = (a) => a.line && a.pincode;

const keepOneDefault = (user, defaultId) => {
  user.addresses.forEach((a) => {
    a.isDefault = defaultId ? String(a._id) === String(defaultId) : a.isDefault;
  });
  if (user.addresses.length && !user.addresses.some((a) => a.isDefault)) {
    user.addresses[0].isDefault = true;
  }
};

router.get("/me/addresses", async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  res.json(user.addresses);
});

router.post("/me/addresses", async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  const address = cleanAddress(req.body);
  if (!validAddress(address)) return res.status(400).json({ error: "Address and pincode are required." });
  if (user.addresses.length >= 10) return res.status(400).json({ error: "You can save up to 10 addresses." });
  user.addresses.push(address);
  const added = user.addresses[user.addresses.length - 1];
  keepOneDefault(user, address.isDefault ? added._id : null);
  await user.save();
  res.status(201).json({ address: added, addresses: user.addresses });
});

router.put("/me/addresses/:addressId", async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  const existing = user.addresses.id(req.params.addressId);
  if (!existing) return res.status(404).json({ error: "Address not found." });
  const address = cleanAddress(req.body);
  if (!validAddress(address)) return res.status(400).json({ error: "Address and pincode are required." });
  Object.assign(existing, address);
  keepOneDefault(user, address.isDefault ? existing._id : null);
  await user.save();
  res.json({ address: existing, addresses: user.addresses });
});

router.delete("/me/addresses/:addressId", async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  const existing = user.addresses.id(req.params.addressId);
  if (!existing) return res.status(404).json({ error: "Address not found." });
  existing.deleteOne();
  keepOneDefault(user, null);
  await user.save();
  res.json({ addresses: user.addresses });
});

module.exports = router;
