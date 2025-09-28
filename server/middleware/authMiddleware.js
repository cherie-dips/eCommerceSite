const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error("Token verification failed:", err.message);
        return res.status(403).json("Token is not valid");
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json("You are not authenticated");
  }
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

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyRetailer
};