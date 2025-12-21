const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { isMongoConfigured } = require('../db');
const { findUserByEmail, findUserById, createUser, updateUser } = require('../dataStore');
const bcrypt = require('bcryptjs');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mongoConfigured: isMongoConfigured,
    timestamp: new Date().toISOString()
  });
});

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role, department, studentId } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await createUser({
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      role: role || 'student',
      department: department ? department.trim() : '',
      studentId: studentId ? studentId.trim() : '',
    });

    // Generate token
    const userId = isMongoConfigured ? user._id : user.id;
    const token = generateToken(userId);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    // Handle MongoDB errors
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    if (error.name === 'MongooseError' || error.message.includes('connection')) {
      return res.status(503).json({ message: 'Database connection error. Please check your MongoDB configuration.' });
    }
    res.status(500).json({ message: error.message || 'Failed to create user' });
  }
});

// Sign in
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await findUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    let isMatch = false;
    if (isMongoConfigured) {
      isMatch = await user.comparePassword(password);
    } else {
      // In-memory mode: compare with bcrypt
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const userId = isMongoConfigured ? user._id : user.id;
    const token = generateToken(userId);

    res.json({
      message: 'Sign in successful',
      token,
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        studentId: user.studentId,
      },
    });
  } catch (error) {
    console.error('Signin error:', error);
    if (error.name === 'MongooseError' || error.message.includes('connection')) {
      return res.status(503).json({ message: 'Database connection error. Please check your MongoDB configuration.' });
    }
    res.status(500).json({ message: error.message || 'Failed to sign in' });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Remove password from response
    const { password, ...userWithoutPassword } = user.toObject ? user.toObject() : user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: error.message || 'Failed to get profile' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, department, studentId } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (department !== undefined) updates.department = department;
    if (studentId !== undefined) updates.studentId = studentId;

    const userId = req.user._id || req.user.id;
    const user = await updateUser(userId, updates);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
});

// Verify token
router.get('/verify', authenticate, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;

