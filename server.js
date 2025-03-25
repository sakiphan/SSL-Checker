require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const routes = require('./src/routes');

// Check if data directory exists and create it
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Apply routes
app.use(routes);

// Redirect all other requests to home page (for SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`SSL Monitor server running at http://localhost:${PORT}`);
}); 