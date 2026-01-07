const express = require('express');
const router = express.Router();

const { getRooms, updateRoomStatus, toggleFavoriteRoom } = require('../dataStore');

router.get('/', async (_req, res) => {
  const rooms = await getRooms();
  res.json(rooms);
});

router.put('/:id/status', async (req, res) => {
  const updated = await updateRoomStatus(req.params.id, req.body.status);
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
});

router.post('/:id/favorite', async (req, res) => {
  const updated = await toggleFavoriteRoom(req.params.id, req.body.userId || 'anon');
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
});

module.exports = router;

