const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  department: { type: String, default: 'general' },
  type: { type: String, default: 'event' },
  date: { type: String, required: true },
  interested: { type: Number, default: 0 },
  shareLink: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);

