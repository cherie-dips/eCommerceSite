// Turns a failed sign-up into a message that is safe to show to the user.
// Returns null when the error is not something the user can fix.
const registrationErrorMessage = (err) => {
  if (err && err.code === 11000) {
    if (err.keyPattern && err.keyPattern.email) return "An account with this email already exists.";
    if (err.keyPattern && err.keyPattern.username) return "This username is already taken.";
    return "This account already exists.";
  }
  return null;
};

const missingFields = (body, fields) => fields.filter((f) => !body || !String(body[f] || "").trim());

module.exports = { registrationErrorMessage, missingFields };
