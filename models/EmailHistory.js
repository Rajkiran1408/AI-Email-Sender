const mongoose = require("mongoose");

const EmailHistorySchema = new mongoose.Schema({
  to: String,
  subject: String,
  bodyHtml: String,
  sentAt: Date,
});

module.exports = mongoose.model("EmailHistory", EmailHistorySchema);
