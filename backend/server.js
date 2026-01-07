const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const { connectDB } = require('./db');
const { seedMongoDB } = require('./dataStore');

const authRoutes = require('./routes/auth');
const cafeteriaRoutes = require('./routes/cafeteria');
const newsRoutes = require('./routes/news');
const eventsRoutes = require('./routes/events');
const roomsRoutes = require('./routes/rooms');
const thesisRoutes = require('./routes/thesis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());

// Request logging middleware for debugging and monitoring
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  
  // Track response time
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${timestamp}] ${req.method} ${req.path} - Status: ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Auth routes (public)
app.use('/api/auth', authRoutes);

// API routes
app.use('/api/cafeteria', cafeteriaRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/thesis', thesisRoutes);

// Handle non-existent API routes (must be before static files)
app.use('/api/*', (req, res) => {
  console.warn(`[NOT FOUND] ${req.method} ${req.path}`);
  res.status(404).json({ message: 'API endpoint not found' });
});

// Serve static frontend (only for non-API routes)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Fallback to index.html for non-API routes only
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err);
  
  if (err.message && err.message.includes('Only image files are allowed')) {
    return res.status(400).json({ message: err.message });
  }
  
  // Handle file size limit errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File size exceeds limit (max 5MB)' });
  }
  
  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  
  res.status(500).json({ 
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize database connection and start server
async function startServer() {
  try {
    const dbConnection = await connectDB();
    if (dbConnection) {
      await seedMongoDB();
    }
    
    // Try to start server, handle port already in use
    app.listen(PORT, () => {
      console.log(`\n✅ Virtual Campus server running at http://localhost:${PORT}`);
      console.log(`📊 Database: ${dbConnection ? 'MongoDB Atlas' : 'In-memory mode'}`);
      console.log(`🔐 Default admin: admin@campus.edu / admin123\n`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.log(`💡 Try one of these solutions:`);
        console.log(`   1. Stop the other process using port ${PORT}`);
        console.log(`   2. Change PORT in .env file to a different number (e.g., 3001)`);
        console.log(`   3. Find and kill the process: netstat -ano | findstr :${PORT}\n`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Still start server with in-memory fallback
    app.listen(PORT, () => {
      console.log(`\n✅ Virtual Campus server running at http://localhost:${PORT} (in-memory mode)`);
      console.log(`🔐 Default admin: admin@campus.edu / admin123\n`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.log(`💡 Change PORT in .env file or stop the other process\n`);
        process.exit(1);
      }
    });
  }
}

startServer();

