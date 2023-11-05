const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({
  active: Boolean,
});

module.exports = mongoose.model("settings", SettingsSchema);
