const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');

const { getMenu, upsertMenuItem, deleteMenuItem } = require('../dataStore');

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

router.get('/menu', async (req, res) => {
  try {
    const { allergy } = req.query;
    const menu = await getMenu({ allergy });
    res.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch menu' });
  }
});

router.post('/menu', authenticate, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    const itemData = { ...req.body };
    
    // Parse allergies from comma-separated string to array
    if (itemData.allergies && typeof itemData.allergies === 'string') {
      itemData.allergies = itemData.allergies
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);
    } else if (!itemData.allergies) {
      itemData.allergies = [];
    }
    
    // Convert image to base64 if provided
    if (req.file) {
      itemData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    
    const item = await upsertMenuItem(itemData);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating menu item:', error);
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to create menu item' });
  }
});

router.put('/menu/:id', authenticate, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    const itemData = { ...req.body, id: req.params.id };
    
    // Parse allergies from comma-separated string to array
    if (itemData.allergies && typeof itemData.allergies === 'string') {
      itemData.allergies = itemData.allergies
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);
    } else if (!itemData.allergies) {
      itemData.allergies = [];
    }
    
    // Convert image to base64 if provided
    if (req.file) {
      itemData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    
    const item = await upsertMenuItem(itemData);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  } catch (error) {
    console.error('Error updating menu item:', error);
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to update menu item' });
  }
});

router.delete('/menu/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await deleteMenuItem(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: error.message || 'Failed to delete menu item' });
  }
});

// Update sales count - admin only
router.post('/menu/:id/sales', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }
    
    // Get menu to find item
    const menu = await getMenu({});
    const item = menu.find(m => (m._id?.toString() === req.params.id || m.id === req.params.id));
    
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Update sales count
    const updatedItem = await upsertMenuItem({
      id: req.params.id,
      ...item,
      salesCount: (item.salesCount || 0) + quantity
    });
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating sales count:', error);
    res.status(500).json({ message: error.message || 'Failed to update sales count' });
  }
});

// Analytics endpoint - admin only
router.get('/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const menu = await getMenu({});
    // Sort by salesCount descending (most popular first)
    const analytics = menu.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch analytics' });
  }
});

module.exports = router;


