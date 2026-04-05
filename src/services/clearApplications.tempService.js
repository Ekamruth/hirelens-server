require("dotenv").config();
const mongoose = require("mongoose");

const Application = require("../models/application.model");

async function clearApplications() {
  try {
    // 🔥 CONNECT FIRST
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // 🧹 CLEAR COLLECTION
    await Application.deleteMany({});
    console.log("🧹 Applications collection cleared");

    // 🔚 EXIT CLEANLY
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

clearApplications();