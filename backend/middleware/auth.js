const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isMongoConfigured } = require('../db');
const { findUserById } = require('../dataStore');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT token with enhanced error handling
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required - No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired - Please sign in again' });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token - Please sign in again' });
      }
      throw jwtError;
    }
    
    let user;
    if (isMongoConfigured) {
      user = await User.findById(decoded.userId).select('-password');
    } else {
      user = await findUserById(decoded.userId);
      if (user && user.password) {
        delete user.password;
      }
    }
    
    if (!user) {
      return res.status(401).json({ message: 'User not found - Please sign in again' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      console.warn(`Authorization failed: User ${req.user.email} with role ${req.user.role} tried to access admin resource`);
      return res.status(403).json({ message: `Insufficient permissions - Required role: ${roles.join(' or ')}` });
    }
    
    next();
  };
};

module.exports = { authenticate, authorize, JWT_SECRET };

