const { rateLimit } = require("express-rate-limit");
const config = require("../config");

const tooMany = (message) => ({ error: message });

// Wrong-password guesses: 10 failed logins per 15 minutes per network address.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => config.isTest,
  message: tooMany("Too many failed logins. Please wait 15 minutes and try again."),
});

// Sign-ups, password-reset emails, etc.
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => config.isTest,
  message: tooMany("Too many requests. Please wait a few minutes and try again."),
});

// AI design suggestions cost money per request, so each user gets a few per hour.
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: () => config.ai.perUserPerHour,
  keyGenerator: (req) => String(req.user.id),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => config.isTest,
  message: tooMany("You've used all your AI suggestions for this hour. Try the free suggestions, or come back later."),
});

module.exports = { loginLimiter, accountLimiter, aiLimiter };
