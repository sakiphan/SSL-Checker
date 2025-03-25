const db = require('../utils/db');
const telegramService = require('../services/telegramService');
const schedulerService = require('../services/schedulerService');

// Get all settings
const getSettings = (req, res) => {
  try {
    const settings = db.get('settings').value();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update Telegram settings
const updateTelegramSettings = (req, res) => {
  try {
    const { botToken, channelId } = req.body;
    
    if (!botToken || !channelId) {
      return res.status(400).json({ success: false, error: 'Bot token and channel ID are required' });
    }
    
    const settings = telegramService.updateBotSettings(botToken, channelId);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Test Telegram bot
const testTelegramBot = async (req, res) => {
  try {
    const result = await telegramService.testBot();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update schedule settings
const updateScheduleSettings = (req, res) => {
  try {
    const { cronExpression } = req.body;
    
    if (!cronExpression) {
      return res.status(400).json({ success: false, error: 'Cron expression is required' });
    }
    
    const result = schedulerService.updateSchedule(cronExpression);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get schedule information
const getScheduleInfo = (req, res) => {
  try {
    const scheduleInfo = schedulerService.getScheduleInfo();
    res.json({ success: true, scheduleInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Run SSL check now
const runSSLCheckNow = async (req, res) => {
  try {
    const result = await schedulerService.runCheckNow();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getSettings,
  updateTelegramSettings,
  testTelegramBot,
  updateScheduleSettings,
  getScheduleInfo,
  runSSLCheckNow
}; 