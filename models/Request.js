const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  text: { type: String, required: true },
  recipient: { type: String },
  response: { type: Object },
  type: { type: String, default: 'email' }, // could be 'email' or 'amazon_products'
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Request', RequestSchema);
