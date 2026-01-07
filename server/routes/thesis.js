const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Thesis = require('../models/Thesis');

// Get all thesis slots
router.get('/', async (req, res) => {
  try {
    const slots = await Thesis.find()
      .populate('supervisor', 'name email')
      .populate('requests.student', 'name email');
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create thesis slot (Admin and Faculty only)
router.post('/', authMiddleware, roleCheck(['admin', 'faculty']), async (req, res) => {
  try {
    const { title, description, maxStudents } = req.body;
    const slot = new Thesis({
      title,
      description,
      supervisor: req.user.role === 'faculty' ? req.user.id : null,
      maxStudents,
      requests: []
    });
    await slot.save();
    await slot.populate('supervisor', 'name email');
    res.status(201).json(slot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update thesis slot (Admin and supervisor only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const slot = await Thesis.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    
    if (req.user.role !== 'admin' && slot.supervisor.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { title, description, maxStudents } = req.body;
    slot.title = title || slot.title;
    slot.description = description || slot.description;
    slot.maxStudents = maxStudents || slot.maxStudents;
    
    await slot.save();
    await slot.populate('supervisor', 'name email');
    res.json(slot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete thesis slot (Admin and supervisor only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const slot = await Thesis.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    
    if (req.user.role !== 'admin' && slot.supervisor.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Thesis.findByIdAndDelete(req.params.id);
    res.json({ message: 'Slot deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request supervision (Student only)
router.post('/:id/request', authMiddleware, roleCheck(['student']), async (req, res) => {
  try {
    const slot = await Thesis.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    
    slot.requests.push({
      student: req.user.id,
      status: 'pending',
      requestDate: new Date()
    });
    
    await slot.save();
    await slot.populate('supervisor', 'name email');
    await slot.populate('requests.student', 'name email');
    res.json(slot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Accept request (Supervisor only)
router.post('/:id/accept/:requestId', authMiddleware, roleCheck(['faculty', 'admin']), async (req, res) => {
  try {
    const slot = await Thesis.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    
    if (req.user.role === 'faculty' && slot.supervisor.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const request = slot.requests.id(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    request.status = 'accepted';
    await slot.save();
    await slot.populate('supervisor', 'name email');
    await slot.populate('requests.student', 'name email');
    res.json(slot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reject request (Supervisor only)
router.delete('/:id/request/:requestId', authMiddleware, async (req, res) => {
  try {
    const slot = await Thesis.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    
    if (req.user.role === 'faculty' && slot.supervisor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    slot.requests.id(req.params.requestId).deleteOne();
    await slot.save();
    res.json({ message: 'Request deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;