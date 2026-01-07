const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  building: { type: String, required: true },
  status: { type: String, enum: ['Available', 'Occupied'], default: 'Available' },
  favoriteBy: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.models.Room || mongoose.model('Room', roomSchema);

