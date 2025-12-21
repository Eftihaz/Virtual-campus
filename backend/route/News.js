const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const {
  getNews,
  addNews,
  updateNews,
  deleteNews,
  likeNews,
  commentNews,
} = require('../dataStore');

router.get('/', async (req, res) => {
  try {
    const { department, category, date } = req.query;
    const items = await getNews({ department, category, date });
    res.json(items);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch news' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const created = await addNews(req.body, req.user);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ message: error.message || 'Failed to create news' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const updated = await updateNews(req.params.id, req.body, req.user);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({ message: error.message || 'Failed to update news' });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    await deleteNews(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ message: error.message || 'Failed to delete news' });
  }
});

router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const item = await likeNews(req.params.id, req.user);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (error) {
    console.error('Error liking news:', error);
    res.status(500).json({ message: error.message || 'Failed to like news' });
  }
});

router.post('/:id/comment', authenticate, async (req, res) => {
  try {
    if (!req.body.text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    const item = await commentNews(req.params.id, req.body.text, req.user);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (error) {
    console.error('Error commenting on news:', error);
    res.status(500).json({ message: error.message || 'Failed to comment' });
  }
});

module.exports = router;

