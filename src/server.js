const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const { connectDB } = require('./db');
const { seedMongoDB } = require('./dataStore');

const cafeteriaRoutes = require('./routes/cafeteria');
const newsRoutes = require('./routes/news');
const eventsRoutes = require('./routes/events');
const roomsRoutes = require('./routes/rooms');
const thesisRoutes = require('./routes/thesis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/cafeteria', cafeteriaRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/thesis', thesisRoutes);

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Fallback to index.html for root
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Initialize database connection and start server
async function startServer() {
  try {
    await connectDB();
    await seedMongoDB();
    app.listen(PORT, () => {
      console.log(`Virtual Campus server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

