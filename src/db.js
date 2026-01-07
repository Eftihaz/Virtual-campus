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
    const uri = process.env.MONGODB_URI.replace('<db_password>', process.env.DB_PASSWORD || '');
    await mongoose.connect(uri);
    isConnected = true;
    console.log('Connected to MongoDB Atlas');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
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
