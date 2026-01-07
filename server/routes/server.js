const express = require('express');
const app = express();

// Importing routes
const newsRoutes = require('./routes/news');
const eventRoutes = require('./routes/events');
const menuRoutes = require('./routes/menu');
const thesisRoutes = require('./routes/thesis');

// Using routes
app.use('/api/news', newsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/thesis', thesisRoutes);

module.exports = app;
