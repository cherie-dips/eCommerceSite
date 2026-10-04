// Login / sign-up logic shared by customers (/api/auth) and retailers (/api/retailer).
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const config = require("../config");
const User = require("../models/User");
const { registrationErrorMessage, missingFields } = require("../utils/authErrors");
const { signToken, publicUser, createOneTimeToken } = require("../utils/tokens");
const { emails } = require("../utils/email");

const googleClient = new OAuth2Client(config.googleClientId);

const MIN_PASSWORD_LENGTH = 6;

// Emails are matched without caring about capital letters.
const findUserByEmail = (email, select) => {
  const query = User.findOne({ email: String(email || "").trim() }).collation({ locale: "en", strength: 2 });
  return select ? query.select(select) : query;
};

const sendVerificationEmail = async (user) => {
  const { token, hash } = createOneTimeToken();
  user.emailVerifyTokenHash = hash;
  user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  await emails.verifyEmail(user, `${config.clientUrl}/verify-email?token=${token}`);
};

// role: "user" for customers, "retailer" for sellers. Admins are never created here.
const register = (role) => async (req, res) => {
  if (missingFields(req.body, ["username", "email", "password"]).length) {
    return res.status(400).json({ error: "Username, email and password are required." });
  }
  if (String(req.body.password).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  const email = String(req.body.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  try {
    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const newUser = new User({
      username: String(req.body.username).trim(),
      email,
      password: await bcrypt.hash(String(req.body.password), 10),
      role,
      // Sellers need an admin's approval before listing products
      approved: role !== "retailer",
    });
    const savedUser = await newUser.save();
    await sendVerificationEmail(savedUser);

    res.status(201).json({
      message: role === "retailer" ? "Retailer registered" : "User registered",
      user: { id: savedUser._id, role: savedUser.role },
    });
  } catch (err) {
    const message = registrationErrorMessage(err);
    if (message) return res.status(409).json({ error: message });
    console.error("Registration Error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
};

const login = async (req, res) => {
  if (missingFields(req.body, ["email", "password"]).length) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const user = await findUserByEmail(req.body.email);
    if (!user || !user.password) return res.status(401).json("Invalid credentials");

    const validPassword = await bcrypt.compare(String(req.body.password), user.password);
    if (!validPassword) return res.status(401).json("Invalid credentials");

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

const googleLogin = (role) => async (req, res) => {
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.token,
      audience: config.googleClientId,
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.error("Google token check failed:", err.message);
    return res.status(401).json({ error: "Google sign-in could not be verified." });
  }

  try {
    const { email, picture, sub } = payload;
    let user = await findUserByEmail(email);

    if (!user) {
      const candidate = new User({
        username: email,
        email: email.toLowerCase(),
        password: "",
        role,
        approved: role !== "retailer",
        googleId: sub,
        profilePicture: picture,
        emailVerified: true, // Google has already confirmed this email
      });
      try {
        user = await candidate.save();
      } catch (e) {
        if (e.code === 11000 && e.keyPattern && e.keyPattern.username) {
          candidate.username = `${email}_${Date.now()}`;
          user = await candidate.save();
        } else {
          throw e;
        }
      }
    } else if (role === "retailer" && user.role === "user") {
      // Never turn an existing customer account into a retailer account silently.
      return res.status(403).json({
        error: "This email already has a customer account. Please log in as a customer.",
      });
    } else if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("Google OAuth Error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  findUserByEmail,
  sendVerificationEmail,
  MIN_PASSWORD_LENGTH,
};
