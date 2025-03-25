const express = require('express');
const websiteRoutes = require('./websiteRoutes');
const settingsRoutes = require('./settingsRoutes');

const router = express.Router();

// Configure API routes
router.use('/api/websites', websiteRoutes);
router.use('/api/settings', settingsRoutes);

// Simple welcome message for the home page
router.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SSL Monitor</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f4f7f9;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #2c3e50;
          }
          p {
            color: #7f8c8d;
            margin-bottom: 1.5rem;
          }
          .btn {
            display: inline-block;
            background-color: #3498db;
            color: white;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>SSL Monitor</h1>
          <p>A powerful tool to help you monitor your SSL certificates.</p>
          <a href="/dashboard" class="btn">Login</a>
        </div>
      </body>
    </html>
  `);
});

module.exports = router; 