const express = require('express');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

// Get all settings
router.get('/', settingsController.getSettings);

// Update Telegram settings
router.post('/telegram', settingsController.updateTelegramSettings);

// Update Email settings
router.post('/email', settingsController.updateEmailSettings);

// Update notification preferences
router.post('/notifications', settingsController.updateNotificationPreferences);

// Test Telegram bot
router.post('/telegram/test', settingsController.testTelegramBot);

// Test Email notification
router.post('/email/test', settingsController.testEmailNotification);

// Update schedule settings
router.post('/schedule', settingsController.updateScheduleSettings);

// Get schedule information
router.get('/schedule', settingsController.getScheduleInfo);

// Run SSL check manually
router.post('/check-ssl', settingsController.runSslCheck);

// Update security settings
router.post('/security', settingsController.updateSecuritySettings);

module.exports = router; 