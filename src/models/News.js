const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  category: { type: String, default: 'general' },
  department: { type: String, default: 'general' },
  likes: { type: Number, default: 0 },
  comments: [commentSchema],
}, { timestamps: true });

module.exports = mongoose.models.News || mongoose.model('News', newsSchema);

