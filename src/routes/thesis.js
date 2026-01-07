const express = require('express');
const router = express.Router();

const {
  getThesisSlots,
  toggleSlot,
  requestSupervision,
  updateThesisStatus,
} = require('../dataStore');

router.get('/', async (_req, res) => {
  const slots = await getThesisSlots();
  res.json(slots);
});

router.post('/:id/toggle', async (req, res) => {
  const slot = await toggleSlot(req.params.id, req.body.open);
  if (!slot) return res.status(404).json({ message: 'Not found' });
  res.json(slot);
});

router.post('/:id/request', async (req, res) => {
  const request = await requestSupervision(req.params.id, req.body);
  if (!request) return res.status(404).json({ message: 'Not found' });
  res.status(201).json(request);
});

router.post('/:slotId/requests/:requestId/status', async (req, res) => {
  const updated = await updateThesisStatus(
    req.params.slotId,
    req.params.requestId,
    req.body.status
  );
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
});

module.exports = router;

