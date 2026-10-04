const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config");

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// What the website is allowed to know about the logged-in user
const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  approved: user.approved !== false,
  emailVerified: Boolean(user.emailVerified),
  profilePicture: user.profilePicture,
});

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// One-time token for email links. Only the hash is stored in the database.
const createOneTimeToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
};

module.exports = { signToken, publicUser, hashToken, createOneTimeToken };
