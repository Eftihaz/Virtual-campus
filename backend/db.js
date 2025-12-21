const mongoose = require('mongoose');

const isMongoConfigured = process.env.MONGODB_URI && !process.env.USE_IN_MEMORY;

let isConnected = false;

async function connectDB() {
  if (!isMongoConfigured) {
    console.log('Using in-memory data store (MongoDB not configured)');
    return null;
  }

  if (isConnected) {
    return mongoose.connection;
  }

  try {
    let uri = process.env.MONGODB_URI;
    // Replace password placeholder if it exists and DB_PASSWORD is provided
    if (uri.includes('<db_password>') && process.env.DB_PASSWORD) {
      uri = uri.replace('<db_password>', encodeURIComponent(process.env.DB_PASSWORD));
    } else if (uri.includes('<db_password>')) {
      console.warn('Warning: MONGODB_URI contains <db_password> but DB_PASSWORD is not set. Using empty password.');
      uri = uri.replace('<db_password>', '');
    }
    await mongoose.connect(uri);
    isConnected = true;
    console.log('Connected to MongoDB Atlas');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Don't throw if MongoDB fails - allow fallback to in-memory
    console.log('Falling back to in-memory data store');
    return null;
  }
}

async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('Disconnected from MongoDB');
  }
}

module.exports = { connectDB, disconnectDB, isMongoConfigured };
