const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  groupMembers: { type: [String], default: [] },
  topic: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

const thesisSlotSchema = new mongoose.Schema({
  supervisor: { type: String, required: true },
  topic: { type: String, default: '' },
  open: { type: Boolean, default: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  requests: [requestSchema],
}, { timestamps: true });

module.exports = mongoose.models.ThesisSlot || mongoose.model('ThesisSlot', thesisSlotSchema);

