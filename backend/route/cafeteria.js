const express = require('express');
const router = express.Router();

const { getMenu, upsertMenuItem } = require('../dataStore');

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

router.post('/menu', async (req, res) => {
  try {
    const item = await upsertMenuItem(req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ message: error.message || 'Failed to create menu item' });
  }
});

router.put('/menu/:id', async (req, res) => {
  try {
    const item = await upsertMenuItem({ ...req.body, id: req.params.id });
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ message: error.message || 'Failed to update menu item' });
  }
});

module.exports = router;

