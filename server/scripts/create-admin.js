// Creates the first admin, or gives an existing account admin access.
//   npm run create-admin -- you@example.com "a-strong-password" "Your Name"
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const config = require("../config");
const User = require("../models/User");

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email) {
    console.log('Usage: npm run create-admin -- <email> <password> ["Name"]');
    process.exit(1);
  }
  await mongoose.connect(config.mongoUri);

  const existing = await User.findOne({ email }).collation({ locale: "en", strength: 2 });
  if (existing) {
    existing.role = "admin";
    existing.approved = true;
    await existing.save();
    console.log(`${existing.email} is now an admin.`);
  } else {
    if (!password || password.length < 8) {
      console.log("Give a password of at least 8 characters for the new admin account.");
      process.exit(1);
    }
    await new User({
      username: name || "Admin",
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role: "admin",
      approved: true,
      emailVerified: true,
    }).save();
    console.log(`Created admin account ${email}.`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
