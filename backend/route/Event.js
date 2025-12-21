const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const {
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  markInterest,
  shareEvent,
} = require('../dataStore');

router.get('/', async (req, res) => {
  try {
    const { department, type, date } = req.query;
    const items = await getEvents({ department, type, date });
    res.json(items);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch events' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const created = await addEvent(req.body, req.user);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: error.message || 'Failed to create event' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const updated = await updateEvent(req.params.id, req.body, req.user);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: error.message || 'Failed to update event' });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    await deleteEvent(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: error.message || 'Failed to delete event' });
  }
});

router.post('/:id/interest', authenticate, async (req, res) => {
  try {
    const item = await markInterest(req.params.id, req.user);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (error) {
    console.error('Error marking interest:', error);
    res.status(500).json({ message: error.message || 'Failed to mark interest' });
  }
});

router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const link = await shareEvent(req.params.id);
    if (!link) return res.status(404).json({ message: 'Not found' });
    res.json({ link });
  } catch (error) {
    console.error('Error sharing event:', error);
    res.status(500).json({ message: error.message || 'Failed to share event' });
  }
});

module.exports = router;

