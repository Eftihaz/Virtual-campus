const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const News = require('../models/News');

// Get all news
router.get('/', async (req, res) => {
  try {
    const news = await News.find()
      .populate('author', 'name role')
      .populate('likes', 'name')
      .populate('comments.author', 'name role')
      .sort({ createdAt: -1 });
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create news (Admin and Faculty only)
router.post('/', authMiddleware, roleCheck(['admin', 'faculty']), async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const news = new News({
      title,
      content,
      category,
      author: req.user.id
    });
    await news.save();
    await news.populate('author', 'name role');
    res.status(201).json(news);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update news (Admin and author only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ error: 'News not found' });
    
    // Only admin or the author can edit
    if (req.user.role !== 'admin' && news.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { title, content, category } = req.body;
    news.title = title || news.title;
    news.content = content || news.content;
    news.category = category || news.category;
    
    await news.save();
    await news.populate('author', 'name role');
    res.json(news);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete news (Admin and author only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ error: 'News not found' });
    
    // Only admin or the author can delete
    if (req.user.role !== 'admin' && news.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await News.findByIdAndDelete(req.params.id);
    res.json({ message: 'News deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like news
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ error: 'News not found' });
    
    if (!news.likes.includes(req.user.id)) {
      news.likes.push(req.user.id);
      await news.save();
    }
    
    await news.populate('author', 'name role');
    await news.populate('likes', 'name');
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ error: 'News not found' });
    
    news.comments.push({
      author: req.user.id,
      text,
      createdAt: new Date()
    });
    
    await news.save();
    await news.populate('author', 'name role');
    await news.populate('comments.author', 'name role');
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;