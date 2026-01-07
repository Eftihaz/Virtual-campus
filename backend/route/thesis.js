const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const {
  getThesisSlots,
  addThesisSlot,
  updateThesisSlot,
  toggleSlot,
  deleteThesisSlot,
  requestSupervision,
  updateThesisStatus,
  deleteThesisRequest,
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

// Admin: Add thesis slot
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const slot = await addThesisSlot(req.body);
    res.status(201).json(slot);
  } catch (error) {
    console.error('Error creating thesis slot:', error);
    res.status(500).json({ message: error.message || 'Failed to create thesis slot' });
  }
});

// Admin: Update thesis slot
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const updated = await updateThesisSlot(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating thesis slot:', error);
    res.status(500).json({ message: error.message || 'Failed to update thesis slot' });
  }
});

// Admin: Delete thesis slot
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await deleteThesisSlot(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting thesis slot:', error);
    res.status(500).json({ message: error.message || 'Failed to delete thesis slot' });
  }
});

// Faculty: Add thesis supervision slot
router.post('/supervision', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const slotData = {
      ...req.body,
      supervisor: req.user.name || req.body.supervisor,
    };
    const slot = await addThesisSlot(slotData);
    res.status(201).json(slot);
  } catch (error) {
    console.error('Error creating thesis supervision:', error);
    res.status(500).json({ message: error.message || 'Failed to create thesis supervision' });
  }
});

// Faculty: Update thesis supervision slot
router.put('/supervision/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const slot = await getThesisSlots();
    const targetSlot = slot.find(s => (s._id || s.id).toString() === req.params.id);
    
    // Check if faculty owns this slot or is admin
    if (req.user.role !== 'admin' && targetSlot && targetSlot.supervisor !== req.user.name) {
      return res.status(403).json({ message: 'You can only edit your own thesis supervision slots' });
    }
    
    const updated = await updateThesisSlot(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating thesis supervision:', error);
    res.status(500).json({ message: error.message || 'Failed to update thesis supervision' });
  }
});

// Faculty: Delete thesis supervision slot
router.delete('/supervision/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const slot = await getThesisSlots();
    const targetSlot = slot.find(s => (s._id || s.id).toString() === req.params.id);
    
    // Check if faculty owns this slot or is admin
    if (req.user.role !== 'admin' && targetSlot && targetSlot.supervisor !== req.user.name) {
      return res.status(403).json({ message: 'You can only delete your own thesis supervision slots' });
    }
    
    await deleteThesisSlot(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting thesis supervision:', error);
    res.status(500).json({ message: error.message || 'Failed to delete thesis supervision' });
  }
});

router.post('/:id/toggle', authenticate, async (req, res) => {
  try {
    const slot = await toggleSlot(req.params.id, req.body.open);
    if (!slot) return res.status(404).json({ message: 'Not found' });
    res.json(slot);
  } catch (error) {
    console.error('Error toggling slot:', error);
    res.status(500).json({ message: error.message || 'Failed to toggle slot' });
  }
});

router.post('/:id/request', authenticate, async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      studentName: req.user.name || req.body.studentName,
      userId: req.user._id || req.user.id,
    };
    const request = await requestSupervision(req.params.id, requestData);
    if (!request) return res.status(404).json({ message: 'Not found' });
    res.status(201).json(request);
  } catch (error) {
    console.error('Error requesting supervision:', error);
    res.status(500).json({ message: error.message || 'Failed to request supervision' });
  }
});

// Faculty: Accept or reject thesis request
router.post('/:slotId/requests/:requestId/status', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const slots = await getThesisSlots();
    const slot = slots.find(s => (s._id || s.id).toString() === req.params.slotId);
    
    if (!slot) {
      return res.status(404).json({ message: 'Thesis slot not found' });
    }
    
    // Check if faculty owns this slot or is admin
    if (req.user.role !== 'admin' && slot.supervisor !== req.user.name) {
      return res.status(403).json({ message: 'You can only manage requests for your own thesis supervision slots' });
    }
    
    const updated = await updateThesisStatus(
      req.params.slotId,
      req.params.requestId,
      req.body.status
    );
    if (!updated) return res.status(404).json({ message: 'Request not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating thesis status:', error);
    res.status(500).json({ message: error.message || 'Failed to update thesis status' });
  }
});

// Faculty: Delete pending request
router.delete('/:slotId/requests/:requestId', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const slots = await getThesisSlots();
    const slot = slots.find(s => (s._id || s.id).toString() === req.params.slotId);
    
    if (!slot) {
      return res.status(404).json({ message: 'Thesis slot not found' });
    }
    
    // Check if faculty owns this slot or is admin
    if (req.user.role !== 'admin' && slot.supervisor !== req.user.name) {
      return res.status(403).json({ message: 'You can only delete requests for your own thesis supervision slots' });
    }
    
    await deleteThesisRequest(req.params.slotId, req.params.requestId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting thesis request:', error);
    res.status(500).json({ message: error.message || 'Failed to delete thesis request' });
  }
});

module.exports = router;


