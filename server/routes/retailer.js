const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Retailer Register - force role to retailer
router.post("/register", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      role: "retailer",
    });

    const savedUser = await newUser.save();
    res.status(201).json({ message: "Retailer registered", user: { id: savedUser._id, role: savedUser.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retailer Login - ensure role retailer in response
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(401).json("Invalid credentials");

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(401).json("Invalid credentials");

    // If a user exists but not retailer, still allow but mark role as user's stored role
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


