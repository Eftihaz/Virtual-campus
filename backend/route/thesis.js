const express = require('express');
const router = express.Router();

const {
  getThesisSlots,
  toggleSlot,
  requestSupervision,
  updateThesisStatus,
} = require('../dataStore');

router.get('/', async (_req, res) => {
  try {
    const slots = await getThesisSlots();
    res.json(slots);
  } catch (error) {
    console.error('Error fetching thesis slots:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch thesis slots' });
  }
});

router.post('/:id/toggle', async (req, res) => {
  try {
    const slot = await toggleSlot(req.params.id, req.body.open);
    if (!slot) return res.status(404).json({ message: 'Not found' });
    res.json(slot);
  } catch (error) {
    console.error('Error toggling slot:', error);
    res.status(500).json({ message: error.message || 'Failed to toggle slot' });
  }
});

router.post('/:id/request', async (req, res) => {
  try {
    const request = await requestSupervision(req.params.id, req.body);
    if (!request) return res.status(404).json({ message: 'Not found' });
    res.status(201).json(request);
  } catch (error) {
    console.error('Error requesting supervision:', error);
    res.status(500).json({ message: error.message || 'Failed to request supervision' });
  }
});

router.post('/:slotId/requests/:requestId/status', async (req, res) => {
  try {
    const updated = await updateThesisStatus(
      req.params.slotId,
      req.params.requestId,
      req.body.status
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating thesis status:', error);
    res.status(500).json({ message: error.message || 'Failed to update thesis status' });
  }
});

module.exports = router;

