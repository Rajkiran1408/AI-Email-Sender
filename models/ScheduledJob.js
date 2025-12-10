const mongoose = require("mongoose");

const ScheduledJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  bodyHtml: { type: String, required: true },
  sendAt: { type: Date, required: true },
  status: { type: String, default: "scheduled" }  // scheduled, sent, cancelled
});

module.exports = mongoose.model("ScheduledJob", ScheduledJobSchema);


// const mongoose = require("mongoose");

// const EmailHistorySchema = new mongoose.Schema({
//   to: String,
//   subject: String,
//   bodyHtml: String,
//   sentAt: Date,

//   // NEW FIELD — this allows delivery tracking
//   sendResult: {
//     status: { type: String, default: "sent" },   // "sent", "failed"
//     messageId: String,                           // optional
//   },
// });

// module.exports = mongoose.model("EmailHistory", EmailHistorySchema);
