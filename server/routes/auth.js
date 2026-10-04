const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const config = require("../config");
const { verifyToken } = require("../middleware/authMiddleware");
const { loginLimiter, accountLimiter } = require("../utils/rateLimits");
const { publicUser, hashToken, createOneTimeToken } = require("../utils/tokens");
const { emails } = require("../utils/email");
const {
  register,
  login,
  googleLogin,
  findUserByEmail,
  sendVerificationEmail,
  MIN_PASSWORD_LENGTH,
} = require("./authHandlers");

const router = express.Router();

// === Customers: register / login / Google ===
router.post("/register", accountLimiter, register("user"));
router.post("/login", loginLimiter, login);
router.post("/google", loginLimiter, googleLogin("user"));

// === Who am I (refreshes role, approval and email status) ===
router.get("/me", verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json("You are not authenticated");
  res.json({ user: publicUser(user) });
});

// === Forgot password: emails a reset link (valid for 1 hour) ===
router.post("/forgot-password", accountLimiter, async (req, res) => {
  const user = await findUserByEmail(req.body.email);
  // Same answer whether or not the email exists, so nobody can check who has an account.
  const reply = { message: "If an account exists for this email, a reset link has been sent." };
  if (!user) return res.json(reply);

  const { token, hash } = createOneTimeToken();
  user.resetTokenHash = hash;
  user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  await emails.resetPassword(user, `${config.clientUrl}/reset-password?token=${token}`);
  res.json(reply);
});

// === Reset password with the emailed link ===
router.post("/reset-password", accountLimiter, async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: "Reset link and new password are required." });
  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  const user = await User.findOne({
    resetTokenHash: hashToken(String(token)),
    resetExpires: { $gt: new Date() },
  }).select("+resetTokenHash +resetExpires");
  if (!user) return res.status(400).json({ error: "This reset link is invalid or has expired. Please ask for a new one." });

  user.password = await bcrypt.hash(String(password), 10);
  user.resetTokenHash = undefined;
  user.resetExpires = undefined;
  await user.save();
  res.json({ message: "Your password has been changed. You can now log in." });
});

// === Confirm email with the emailed link ===
router.post("/verify-email", async (req, res) => {
  const token = String(req.body?.token || "");
  if (!token) return res.status(400).json({ error: "Verification link is missing." });
  const user = await User.findOne({
    emailVerifyTokenHash: hashToken(token),
    emailVerifyExpires: { $gt: new Date() },
  }).select("+emailVerifyTokenHash +emailVerifyExpires");
  if (!user) return res.status(400).json({ error: "This link is invalid or has expired." });

  user.emailVerified = true;
  user.emailVerifyTokenHash = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();
  res.json({ message: "Your email is confirmed.", user: publicUser(user) });
});

router.post("/resend-verification", verifyToken, accountLimiter, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json("You are not authenticated");
  if (user.emailVerified) return res.json({ message: "Your email is already confirmed." });
  await sendVerificationEmail(user);
  res.json({ message: "We've sent you a new confirmation email." });
});

module.exports = router;
