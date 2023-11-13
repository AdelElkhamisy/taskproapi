const mongoose = require("mongoose");

const languageSchema = new mongoose.Schema({
  code: String,
  nativeName: String,
  name: String,
  active: Boolean,
});

module.exports = mongoose.model('languages', languageSchema);
