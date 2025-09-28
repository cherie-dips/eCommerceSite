const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const router = express.Router();

// Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register
router.post("/register", async (req, res) => {
  try {
    console.log("REGISTER REQUEST BODY:", req.body);

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      role: req.body.role || "user",
    });

    const savedUser = await newUser.save();
    res.status(201).json({ message: "User registered", user: { id: savedUser._id, role: savedUser.role } });
  } catch (err) {
    console.error("Registration Error:", err); // 👈 This line is important
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      console.error("User not found for email:", req.body.email);
      return res.status(401).json("Invalid credentials");
    }

    if (!user) return res.status(401).json("Invalid credentials");

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(401).json("Invalid credentials");

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
      console.error("Login Error:", err);
      res.status(500).json({ error: err.message });
  }
});

// Google OAuth for customers
router.post("/google", async (req, res) => {
  try {
    const { token, role = "user" } = req.body;
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      user = new User({
        username: name,
        email: email,
        password: '', // No password for Google users
        role: role,
        googleId: payload.sub,
        profilePicture: picture
      });
      await user.save();
    }
    
    // Generate JWT
    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({ 
      token: jwtToken, 
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role,
        email: user.email,
        profilePicture: user.profilePicture
      } 
    });
  } catch (err) {
    console.error("Google OAuth Error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

module.exports = router;