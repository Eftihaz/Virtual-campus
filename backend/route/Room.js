const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const { getRooms, addRoom, updateRoom, updateRoomStatus, deleteRoom, toggleFavoriteRoom } = require('../dataStore');

router.get('/', async (_req, res) => {
  try {
    const rooms = await getRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch rooms' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const room = await addRoom(req.body);
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: error.message || 'Failed to create room' });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const updated = await updateRoom(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ message: error.message || 'Failed to update room' });
  }
});

router.put('/:id/status', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const updated = await updateRoomStatus(req.params.id, req.body.status);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating room status:', error);
    res.status(500).json({ message: error.message || 'Failed to update room status' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await deleteRoom(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: error.message || 'Failed to delete room' });
  }
});

router.post('/:id/favorite', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const updated = await toggleFavoriteRoom(req.params.id, userId);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ message: error.message || 'Failed to toggle favorite' });
  }
});

module.exports = router;

