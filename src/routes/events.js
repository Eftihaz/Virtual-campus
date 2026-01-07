const express = require('express');
const router = express.Router();

const {
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  markInterest,
  shareEvent,
} = require('../dataStore');

router.get('/', async (req, res) => {
  const { department, type, date } = req.query;
  const items = await getEvents({ department, type, date });
  res.json(items);
});

router.post('/', async (req, res) => {
  const created = await addEvent(req.body);
  res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
  const updated = await updateEvent(req.params.id, req.body);
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  await deleteEvent(req.params.id);
  res.status(204).send();
});

router.post('/:id/interest', async (req, res) => {
  const item = await markInterest(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

router.post('/:id/share', async (req, res) => {
  const link = await shareEvent(req.params.id);
  if (!link) return res.status(404).json({ message: 'Not found' });
  res.json({ link });
});

module.exports = router;

