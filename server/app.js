// Builds the Express app (without starting it), so tests can use it directly.
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config");
const { UPLOAD_ROOT } = require("./utils/uploads");

const app = express();

// Behind a hosting proxy (Render, Railway...), trust it so rate limits see real addresses.
if (config.isProduction) app.set("trust proxy", 1);

// Security headers. Images must be loadable by the website on another address,
// and the content policy is left to the website (Google sign-in, Razorpay, fonts).
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: false,
  })
);

// Only our own website may call the API from a browser.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// The Razorpay webhook reads the raw body, so it is mounted before the JSON parser.
app.use("/api/payments", require("./routes/payments"));
app.use(express.json({ limit: "1mb" }));

// === Uploaded files (product photos, designs, print files) ===
app.use(
  "/uploads",
  express.static(UPLOAD_ROOT, {
    maxAge: "7d",
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);

// === Routes ===
app.use("/api/products", require("./routes/products"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/retailer", require("./routes/retailer"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/retailer-products", require("./routes/retailer-products"));
app.use("/api/designs", require("./routes/designs"));
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/design-suggestions", require("./routes/suggestions"));

app.get("/api/health", (req, res) =>
  res.json({ ok: true, payments: config.razorpay.enabled ? "razorpay" : "test", email: config.email.enabled, ai: config.ai.enabled })
);

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// === In production, the server also hosts the built website (client/dist) ===
const clientDist = path.join(__dirname, "..", "client", "dist");
if (config.isProduction && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => res.sendFile(path.join(clientDist, "index.html")));
} else {
  app.get("/", (req, res) => res.send("API is running...\n"));
}

// === Errors: log the details, show the user a plain message ===
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "That upload is too large." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid request." });
  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Something went wrong on our side. Please try again." });
});

module.exports = app;
