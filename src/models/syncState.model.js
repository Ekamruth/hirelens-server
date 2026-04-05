const mongoose = require("mongoose");

const syncStateSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  lastSyncedAt: Date,
});

module.exports = mongoose.model("SyncState", syncStateSchema);