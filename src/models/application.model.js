const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: "default-user", // temp (we’ll fix later)
  },

  emailId: {
    type: String,
    required: true,
    unique: true, // 🔥 prevents duplicates
  },

  company: String,
  role: String,

  status: {
    type: String,
    enum: ["applied", "interview", "rejected", "offer", "unknown"],
    default: "unknown",
  },

  appliedDate: Date,
  link: String,
  notes: String,

  rawEmailSnippet: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Application", applicationSchema);