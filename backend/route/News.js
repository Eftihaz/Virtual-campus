const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');

const {
  getNews,
  addNews,
  updateNews,
  deleteNews,
  likeNews,
  commentNews,
} = require('../dataStore');

// Configure multer for image upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'), false);
    } else {
      cb(null, true);
    }
  }
});

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

router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    // All authenticated users can create news (students, faculty, admin)
    const newsData = { ...req.body };
    if (req.file) {
      newsData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    const created = await addNews(newsData, req.user);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating news:', error);
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to create news' });
  }
});

router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const news = await getNews({});
    const targetNews = news.find(n => (n._id || n.id).toString() === req.params.id);
    
    // Check if user owns this news or is admin
    if (req.user.role !== 'admin' && targetNews && targetNews.authorId && 
        (targetNews.authorId._id || targetNews.authorId.id || targetNews.authorId).toString() !== (req.user._id || req.user.id).toString()) {
      return res.status(403).json({ message: 'You can only edit your own news' });
    }
    
    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    
    const updated = await updateNews(req.params.id, updateData, req.user);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating news:', error);
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to update news' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const news = await getNews({});
    const targetNews = news.find(n => (n._id || n.id).toString() === req.params.id);
    
    // Check if user owns this news or is admin
    if (req.user.role !== 'admin' && targetNews && targetNews.authorId && 
        (targetNews.authorId._id || targetNews.authorId.id || targetNews.authorId).toString() !== (req.user._id || req.user.id).toString()) {
      return res.status(403).json({ message: 'You can only delete your own news' });
    }
    
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

