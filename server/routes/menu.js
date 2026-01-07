const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Menu = require('../models/Menu');

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const menu = await Menu.find();
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create menu item (Admin only)
router.post('/', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { name, description, allergens, available } = req.body;
    const item = new Menu({
      name,
      description,
      allergens,
      available
    });
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update menu item (Admin only)
router.put('/:id', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { name, description, allergens, available } = req.body;
    const item = await Menu.findByIdAndUpdate(
      req.params.id,
      { name, description, allergens, available },
      { new: true }
    );
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete menu item (Admin only)
router.delete('/:id', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    await Menu.findByIdAndDelete(req.params.id);
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;