const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const settingsService = require('../services/settingsService');
const notificationService = require('../services/notificationService');
const websiteService = require('../services/websiteService');
const logger = require('../utils/logger');

// Get all settings
const getSettings = (req, res) => {
  try {
    const settings = settingsService.getSettings();
    // Don't return sensitive information like passwords to the frontend
    const safeSettings = { ...settings };
    
    if (safeSettings.telegramBotToken) {
      safeSettings.telegramBotToken = '••••••••••' + safeSettings.telegramBotToken.slice(-4);
    }
    
    if (safeSettings.emailPassword) {
      safeSettings.emailPassword = '••••••••••';
    }
    
    res.json({
      success: true,
      settings: safeSettings
    });
  } catch (error) {
    logger.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings',
      error: error.message
    });
  }
};

// Update Telegram settings
const updateTelegramSettings = (req, res) => {
  try {
    const { telegramEnabled, telegramBotToken, telegramChatId } = req.body;
    
    // Only update the token if it's not the masked version
    const currentSettings = settingsService.getSettings();
    let botToken = telegramBotToken;
    
    if (telegramBotToken && telegramBotToken.startsWith('••••••••••')) {
      botToken = currentSettings.telegramBotToken;
    }
    
    settingsService.updateSettings({
      telegramEnabled: telegramEnabled || false,
      telegramBotToken: botToken,
      telegramChatId
    });
    
    res.json({
      success: true,
      message: 'Telegram settings updated successfully'
    });
  } catch (error) {
    logger.error('Error updating Telegram settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Telegram settings',
      error: error.message
    });
  }
};

// Update Email settings
const updateEmailSettings = (req, res) => {
  try {
    const { 
      emailEnabled, 
      emailHost, 
      emailPort, 
      emailSecure, 
      emailUser, 
      emailPassword, 
      emailFrom, 
      emailTo 
    } = req.body;
    
    // Only update the password if it's not the masked version
    const currentSettings = settingsService.getSettings();
    let password = emailPassword;
    
    if (emailPassword && emailPassword === '••••••••••') {
      password = currentSettings.emailPassword;
    }
    
    settingsService.updateSettings({
      emailEnabled: emailEnabled || false,
      emailHost,
      emailPort: parseInt(emailPort, 10) || 587,
      emailSecure: emailSecure || false,
      emailUser,
      emailPassword: password,
      emailFrom: emailFrom || emailUser,
      emailTo
    });
    
    res.json({
      success: true,
      message: 'Email settings updated successfully'
    });
  } catch (error) {
    logger.error('Error updating Email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Email settings',
      error: error.message
    });
  }
};

// Update notification preferences
const updateNotificationPreferences = (req, res) => {
  try {
    const { notificationChannel } = req.body;
    
    // Validate notification channel
    if (!Object.values(notificationService.NOTIFICATION_CHANNELS).includes(notificationChannel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification channel'
      });
    }
    
    settingsService.updateSettings({
      notificationChannel
    });
    
    res.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
};

// Test Telegram bot
const testTelegramBot = async (req, res) => {
  try {
    // First check if Telegram settings are configured
    const settings = settingsService.getSettings();
    
    if (!settings.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
      return res.status(400).json({
        success: false,
        message: 'Telegram bot is not configured properly. Please update your settings first.'
      });
    }
    
    // Test the notification
    const testResults = await notificationService.testNotifications();
    
    res.json({
      success: testResults.telegram.success,
      message: testResults.telegram.success 
        ? 'Telegram notification sent successfully' 
        : 'Failed to send Telegram notification'
    });
  } catch (error) {
    logger.error('Error testing Telegram bot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Telegram bot',
      error: error.message
    });
  }
};

// Test Email notification
const testEmailNotification = async (req, res) => {
  try {
    // First check if Email settings are configured
    const settings = settingsService.getSettings();
    
    if (!settings.emailEnabled || !settings.emailHost || !settings.emailUser || !settings.emailTo) {
      return res.status(400).json({
        success: false,
        message: 'Email is not configured properly. Please update your settings first.'
      });
    }
    
    // Test the notification
    const testResults = await notificationService.testNotifications();
    
    res.json({
      success: testResults.email.success,
      message: testResults.email.success 
        ? 'Email notification sent successfully' 
        : 'Failed to send Email notification'
    });
  } catch (error) {
    logger.error('Error testing Email notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Email notification',
      error: error.message
    });
  }
};

// Update schedule settings
const updateScheduleSettings = (req, res) => {
  try {
    const { checkFrequency, warningDays } = req.body;
    
    // Validate input
    const frequency = parseInt(checkFrequency, 10);
    const days = parseInt(warningDays, 10);
    
    if (isNaN(frequency) || frequency < 1) {
      return res.status(400).json({
        success: false,
        message: 'Check frequency must be a positive number'
      });
    }
    
    if (isNaN(days) || days < 1) {
      return res.status(400).json({
        success: false,
        message: 'Warning days must be a positive number'
      });
    }
    
    settingsService.updateSettings({
      checkFrequency: frequency,
      warningDays: days
    });
    
    res.json({
      success: true,
      message: 'Schedule settings updated successfully'
    });
  } catch (error) {
    logger.error('Error updating schedule settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule settings',
      error: error.message
    });
  }
};

// Get schedule information
const getScheduleInfo = (req, res) => {
  try {
    const settings = settingsService.getSettings();
    const scheduleInfo = {
      checkFrequency: settings.checkFrequency || 24,
      warningDays: settings.warningDays || 30,
      lastCheck: settings.lastCheckTimestamp ? new Date(settings.lastCheckTimestamp).toISOString() : null,
      nextCheck: settings.nextCheckTimestamp ? new Date(settings.nextCheckTimestamp).toISOString() : null
    };
    
    res.json({
      success: true,
      scheduleInfo
    });
  } catch (error) {
    logger.error('Error getting schedule information:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve schedule information',
      error: error.message
    });
  }
};

// Run SSL check manually
const runSslCheck = async (req, res) => {
  try {
    logger.info('Manual SSL check started');
    
    // Arka planda SSL kontrolü başlat
    setTimeout(async () => {
      try {
        const websites = await websiteService.getAllWebsites();
        const totalCount = websites.length;
        
        logger.info(`Starting SSL check for ${totalCount} websites`);
        if (totalCount === 0) {
          logger.warn('No websites found to check');
          return;
        }
        
        // Tüm sitelerin SSL'ini kontrol et
        const sslResults = await Promise.allSettled(
          websites.map(website => websiteService.checkWebsiteSsl(website.id))
        );
        
        // Sonuçları analiz et
        const successful = sslResults.filter(r => r.status === 'fulfilled' && r.value && r.value.success).length;
        const failed = sslResults.filter(r => r.status === 'rejected' || (r.value && !r.value.success)).length;
        
        logger.info(`SSL check completed: ${successful} successful, ${failed} failed out of ${totalCount} websites`);
        
        // Ayarları al ve güncelle
        const settings = settingsService.getSettings();
        
        // Güvenlik kontrolü etkinleştirilmiş mi kontrol et
        if (settings && settings.enableSecurityCheck === true) {
          logger.info('Starting security check for all websites');
          try {
            const securityResults = await websiteService.securityService.checkAllWebsitesSecurity();
            logger.info(`Security check completed: ${securityResults.checked} websites checked, ${securityResults.errors} errors, avg score: ${securityResults.avgScore}`);
          } catch (secError) {
            logger.error('Error during security check:', secError);
          }
        } else {
          logger.info('Security check is disabled in settings, skipping');
        }
        
        // Son kontrol zamanını güncelle
        settingsService.updateSettings({
          lastCheckTimestamp: Date.now()
        });
        logger.info('Last check timestamp updated in settings');
      } catch (error) {
        logger.error('Error during background SSL check:', error);
      }
    }, 0);
    
    return res.status(200).json({
      success: true,
      message: 'SSL check started in background'
    });
  } catch (error) {
    logger.error('Error starting SSL check:', error);
    return res.status(500).json({
      success: false,
      message: 'Error starting SSL check',
      error: error.message
    });
  }
};

// Güvenlik ayarlarını güncelle
async function updateSecuritySettings(req, res) {
  try {
    logger.info('Güvenlik ayarları güncelleniyor');
    
    const { enableSecurityCheck } = req.body;
    
    // Ayarları veritabanından al
    const settings = await settingsService.getSettings();
    
    // Güvenlik ayarlarını güncelle
    settings.enableSecurityCheck = enableSecurityCheck === true;
    
    // Ayarları kaydet
    await settingsService.updateSettings(settings);
    
    logger.info('Güvenlik ayarları başarıyla güncellendi');
    res.json({ success: true, message: 'Güvenlik ayarları başarıyla güncellendi' });
  } catch (error) {
    logger.error('Güvenlik ayarları güncellenirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Güvenlik ayarları güncellenirken bir hata oluştu' });
  }
}

module.exports = {
  getSettings,
  updateTelegramSettings,
  updateEmailSettings,
  updateNotificationPreferences,
  testTelegramBot,
  testEmailNotification,
  updateScheduleSettings,
  getScheduleInfo,
  runSslCheck,
  updateSecuritySettings
}; 