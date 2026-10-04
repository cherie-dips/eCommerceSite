// All settings come from server/.env (see server/.env.example).
// Optional services (Razorpay, email, AI suggestions) switch on only when their keys are set.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const list = (value) =>
  String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const config = {
  env: process.env.NODE_ENV || "development",
  isTest: process.env.NODE_ENV === "test",
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 5050,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Website address, used in email links. FRONTEND_URL is also allowed to call the API.
  clientUrl: (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, ""),
  allowedOrigins: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    ...list(process.env.FRONTEND_URL),
    ...list(process.env.CLIENT_URL),
  ],

  googleClientId: process.env.GOOGLE_CLIENT_ID,

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  email: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || "Flagzen <no-reply@flagzen.local>",
  },

  ai: {
    // AI design suggestions are on only when an Anthropic API key is set.
    enabled: Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AI_SUGGESTIONS !== "off",
    model: process.env.AI_SUGGESTIONS_MODEL || "claude-opus-5-5",
    perUserPerHour: Number(process.env.AI_SUGGESTIONS_PER_HOUR) || 10,
  },

  // Unpaid orders are cancelled (and their stock released) after this many minutes.
  pendingOrderMinutes: Number(process.env.PENDING_ORDER_MINUTES) || 30,
};

config.razorpay.enabled = Boolean(config.razorpay.keyId && config.razorpay.keySecret);
config.email.enabled = Boolean(config.email.host);

module.exports = config;
