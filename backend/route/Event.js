const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');

const {
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  markInterest,
  shareEvent,
} = require('../dataStore');

// Configure multer for image upload with size limit
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'), false);
    } else {
      cb(null, true);
    }
  }
});

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

router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    // All authenticated users can create events
    const eventData = { ...req.body };
    
    // Convert image file to base64 if provided
    if (req.file) {
      eventData.photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    
    const created = await addEvent(eventData, req.user);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating event:', error);
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to create event' });
  }
});

router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const events = await getEvents({});
    const targetEvent = events.find(e => (e._id || e.id).toString() === req.params.id);
    
    // Students can only edit their own events, faculty and admin can edit any
    if (req.user.role === 'student' && targetEvent && targetEvent.authorId && 
        (targetEvent.authorId._id || targetEvent.authorId.id || targetEvent.authorId).toString() !== (req.user._id || req.user.id).toString()) {
      return res.status(403).json({ message: 'You can only edit your own events' });
    }
    
    const updateData = { ...req.body };
    
    // Convert image file to base64 if provided
    if (req.file) {
      updateData.photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    
    const updated = await updateEvent(req.params.id, updateData, req.user);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating event:', error);
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to update event' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const events = await getEvents({});
    const targetEvent = events.find(e => (e._id || e.id).toString() === req.params.id);
    
    // Students can only delete their own events, faculty and admin can delete any
    if (req.user.role === 'student') {
      if (!targetEvent || !targetEvent.authorId || 
          (targetEvent.authorId._id || targetEvent.authorId.id || targetEvent.authorId).toString() !== (req.user._id || req.user.id).toString()) {
        return res.status(403).json({ message: 'You can only delete your own events' });
      }
    }
    
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

