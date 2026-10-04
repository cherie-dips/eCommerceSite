// Starts the server: connect to the database first, then accept requests.
const mongoose = require("mongoose");
const config = require("./config");
const app = require("./app");
const { cancelStalePendingOrders } = require("./services/orders");

const missing = ["MONGO_URI", "JWT_SECRET"].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`❌ Missing settings in server/.env: ${missing.join(", ")} (see server/.env.example)`);
  process.exit(1);
}
if (!config.googleClientId) console.warn("[WARN] GOOGLE_CLIENT_ID is not set. Google sign-in will fail.");

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`   Payments: ${config.razorpay.enabled ? "Razorpay" : "test mode (no RAZORPAY keys)"}`);
    console.log(`   Email:    ${config.email.enabled ? "SMTP" : "printed here in the console (no SMTP_HOST)"}`);
    console.log(`   AI ideas: ${config.ai.enabled ? "on" : "off (no ANTHROPIC_API_KEY)"}`);
  });

  // Free the stock of orders that were never paid.
  const sweep = () => cancelStalePendingOrders().catch((err) => console.error("Order clean-up failed:", err.message));
  setInterval(sweep, 5 * 60 * 1000).unref();
  sweep();
}

start();
