const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Path to settings file
const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

// Default settings
const DEFAULT_SETTINGS = {
  // Notification settings
  notificationChannel: 'telegram', // telegram, email, both
  
  // Telegram settings
  telegramEnabled: false,
  telegramBotToken: '',
  telegramChatId: '',
  
  // Email settings
  emailEnabled: false,
  emailHost: '',
  emailPort: 587,
  emailSecure: false,
  emailUser: '',
  emailPassword: '',
  emailFrom: '',
  emailTo: '',
  
  // Schedule settings
  checkFrequency: 24, // hours
  warningDays: 30, // days before expiry to start warning
  lastCheckTimestamp: null,
  nextCheckTimestamp: null,
  
  // Other settings
  enableAutoDiscovery: false,
  enableSecurityCheck: false
};

// Ensure the data directory exists
const ensureDataDirectoryExists = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Initialize settings file if it doesn't exist
const initializeSettings = () => {
  ensureDataDirectoryExists();
  
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    logger.info('Settings file initialized with default values');
  }
};

// Get all settings
const getSettings = () => {
  try {
    initializeSettings();
    
    const settingsData = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const settings = JSON.parse(settingsData);
    
    // Ensure all expected fields exist
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    logger.error('Error reading settings:', error);
    return DEFAULT_SETTINGS;
  }
};

// Update settings
const updateSettings = (newSettings) => {
  try {
    initializeSettings();
    
    const currentSettings = getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2));
    logger.info('Settings updated successfully');
    
    return updatedSettings;
  } catch (error) {
    logger.error('Error updating settings:', error);
    throw error;
  }
};

// Reset settings to default
const resetSettings = () => {
  try {
    ensureDataDirectoryExists();
    
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    logger.info('Settings reset to defaults');
    
    return DEFAULT_SETTINGS;
  } catch (error) {
    logger.error('Error resetting settings:', error);
    throw error;
  }
};

// Calculate next check time based on check frequency
const calculateNextCheckTime = () => {
  const settings = getSettings();
  const now = Date.now();
  const nextCheck = now + (settings.checkFrequency * 60 * 60 * 1000); // hours to milliseconds
  
  updateSettings({
    lastCheckTimestamp: now,
    nextCheckTimestamp: nextCheck
  });
  
  return new Date(nextCheck);
};

module.exports = {
  getSettings,
  updateSettings,
  resetSettings,
  calculateNextCheckTime,
  SETTINGS_FILE_PATH: SETTINGS_FILE
}; 