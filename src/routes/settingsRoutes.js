const express = require('express');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

// Get all settings
router.get('/', settingsController.getSettings);

// Update Telegram settings
router.put('/telegram', settingsController.updateTelegramSettings);

// Test Telegram bot
router.post('/telegram/test', settingsController.testTelegramBot);

// Update schedule settings
router.put('/schedule', settingsController.updateScheduleSettings);

// Get schedule information
router.get('/schedule', settingsController.getScheduleInfo);

// Run SSL check manually
router.post('/run-check', settingsController.runSSLCheckNow);

module.exports = router; 