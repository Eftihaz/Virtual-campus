const express = require('express');
const router = express.Router();

const { getRooms, updateRoomStatus, toggleFavoriteRoom } = require('../dataStore');

router.get('/', async (_req, res) => {
  try {
    const rooms = await getRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch rooms' });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const updated = await updateRoomStatus(req.params.id, req.body.status);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating room status:', error);
    res.status(500).json({ message: error.message || 'Failed to update room status' });
  }
});

router.post('/:id/favorite', async (req, res) => {
  try {
    const updated = await toggleFavoriteRoom(req.params.id, req.body.userId || 'anon');
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ message: error.message || 'Failed to toggle favorite' });
  }
});

module.exports = router;

