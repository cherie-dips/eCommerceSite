const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");

// 401 = not logged in / login expired (the website logs the user out on this).
// 403 = logged in, but not allowed to do this.
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json("You are not authenticated");
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      if (!config.isTest) console.error("Token verification failed:", err.message);
      return res.status(401).json("Your login has expired. Please log in again.");
    }
    req.user = user;
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === "admin") {
      next();
    } else {
      res.status(403).json("Admin access required");
    }
  });
};

const verifyRetailer = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === "retailer" || req.user.role === "admin") {
      next();
    } else {
      res.status(403).json("Retailer access required");
    }
  });
};

// Retailer whose account an admin has approved (needed to list or edit products).
const verifyApprovedRetailer = (req, res, next) => {
  verifyRetailer(req, res, async () => {
    if (req.user.role === "admin") return next();
    try {
      const user = await User.findById(req.user.id).select("approved");
      if (!user) return res.status(401).json("You are not authenticated");
      if (user.approved === false) {
        return res.status(403).json({ error: "Your seller account is waiting for approval by the Flagzen team." });
      }
      next();
    } catch (err) {
      next(err);
    }
  });
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyRetailer,
  verifyApprovedRetailer,
};
