const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Event = require('../models/Event');

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('author', 'name role')
      .populate('interested', 'name')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create event (Admin, Faculty, and Students)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, date, location } = req.body;
    const event = new Event({
      title,
      description,
      date,
      location,
      author: req.user.id
    });
    await event.save();
    await event.populate('author', 'name role');
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update event (Author and Admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    // Only admin or the author can edit
    if (req.user.role !== 'admin' && event.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { title, description, date, location } = req.body;
    event.title = title || event.title;
    event.description = description || event.description;
    event.date = date || event.date;
    event.location = location || event.location;
    
    await event.save();
    await event.populate('author', 'name role');
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete event (Author and Admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    // Only admin or author can delete
    if (req.user.role !== 'admin' && event.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark interest
router.post('/:id/interest', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    if (!event.interested.includes(req.user.id)) {
      event.interested.push(req.user.id);
      await event.save();
    }
    
    await event.populate('author', 'name role');
    await event.populate('interested', 'name');
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;