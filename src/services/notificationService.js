const axios = require('axios');
const nodemailer = require('nodemailer');
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

// Notification types
const NOTIFICATION_TYPES = {
  SSL_EXPIRY_WARNING: 'ssl_expiry_warning',
  SSL_EXPIRED: 'ssl_expired',
  SSL_RENEWED: 'ssl_renewed',
  SSL_CHECK_FAILED: 'ssl_check_failed',
  SECURITY_ISSUE: 'security_issue',
  SECURITY_WARNING: 'security_warning'
};

// Notification channels
const NOTIFICATION_CHANNELS = {
  TELEGRAM: 'telegram',
  EMAIL: 'email',
  BOTH: 'both'
};

// Get notification preferences from settings
const getNotificationPreferences = () => {
  const settings = settingsService.getSettings();
  return {
    channel: settings.notificationChannel || NOTIFICATION_CHANNELS.TELEGRAM,
    telegram: {
      enabled: settings.telegramEnabled || false,
      botToken: settings.telegramBotToken || '',
      chatId: settings.telegramChatId || ''
    },
    email: {
      enabled: settings.emailEnabled || false,
      host: settings.emailHost || '',
      port: settings.emailPort || 587,
      secure: settings.emailSecure || false,
      user: settings.emailUser || '',
      password: settings.emailPassword || '',
      from: settings.emailFrom || '',
      to: settings.emailTo || ''
    }
  };
};

// Create email transporter
const createEmailTransporter = (emailConfig) => {
  return nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.user,
      password: emailConfig.password
    }
  });
};

// Send notification via Telegram
const sendTelegramNotification = async (message, type) => {
  try {
    const preferences = getNotificationPreferences();
    
    if (!preferences.telegram.enabled || !preferences.telegram.botToken || !preferences.telegram.chatId) {
      logger.warn('Telegram notification skipped: Telegram is not configured properly');
      return false;
    }
    
    // Format message based on notification type
    let formattedMessage = message;
    if (type === NOTIFICATION_TYPES.SSL_EXPIRY_WARNING) {
      formattedMessage = `⚠️ *SSL Expiry Warning*\n\n${message}`;
    } else if (type === NOTIFICATION_TYPES.SSL_EXPIRED) {
      formattedMessage = `🚨 *SSL Certificate Expired*\n\n${message}`;
    } else if (type === NOTIFICATION_TYPES.SSL_RENEWED) {
      formattedMessage = `✅ *SSL Certificate Renewed*\n\n${message}`;
    } else if (type === NOTIFICATION_TYPES.SSL_CHECK_FAILED) {
      formattedMessage = `❌ *SSL Check Failed*\n\n${message}`;
    } else if (type === NOTIFICATION_TYPES.SECURITY_ISSUE) {
      formattedMessage = `🔒 *Security Issue Detected*\n\n${message}`;
    } else if (type === NOTIFICATION_TYPES.SECURITY_WARNING) {
      formattedMessage = `🔶 *Security Warning*\n\n${message}`;
    }
    
    const response = await axios.post(
      `https://api.telegram.org/bot${preferences.telegram.botToken}/sendMessage`,
      {
        chat_id: preferences.telegram.chatId,
        text: formattedMessage,
        parse_mode: 'Markdown'
      }
    );
    
    if (response.data && response.data.ok) {
      logger.info(`Telegram notification sent successfully for type: ${type}`);
      return true;
    } else {
      logger.error('Telegram notification failed:', response.data);
      return false;
    }
  } catch (error) {
    logger.error('Error sending Telegram notification:', error);
    return false;
  }
};

// Send notification via Email
const sendEmailNotification = async (subject, message, type) => {
  try {
    const preferences = getNotificationPreferences();
    
    if (!preferences.email.enabled || !preferences.email.host || !preferences.email.user || !preferences.email.to) {
      logger.warn('Email notification skipped: Email is not configured properly');
      return false;
    }
    
    // Create transporter
    const transporter = createEmailTransporter(preferences.email);
    
    // Format HTML message based on notification type
    let icon = '🔔';
    let color = '#3498db';
    let title = 'SSL Certificate Notification';
    
    if (type === NOTIFICATION_TYPES.SSL_EXPIRY_WARNING) {
      icon = '⚠️';
      color = '#f39c12';
      title = 'SSL Expiry Warning';
    } else if (type === NOTIFICATION_TYPES.SSL_EXPIRED) {
      icon = '🚨';
      color = '#e74c3c';
      title = 'SSL Certificate Expired';
    } else if (type === NOTIFICATION_TYPES.SSL_RENEWED) {
      icon = '✅';
      color = '#2ecc71';
      title = 'SSL Certificate Renewed';
    } else if (type === NOTIFICATION_TYPES.SSL_CHECK_FAILED) {
      icon = '❌';
      color = '#e74c3c';
      title = 'SSL Check Failed';
    } else if (type === NOTIFICATION_TYPES.SECURITY_ISSUE) {
      icon = '🔒';
      color = '#9b59b6';
      title = 'Security Issue Detected';
    } else if (type === NOTIFICATION_TYPES.SECURITY_WARNING) {
      icon = '🔶';
      color = '#ff9800';
      title = 'Security Warning';
    }
    
    const htmlMessage = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .header {
            background-color: ${color};
            color: white;
            padding: 10px 20px;
            border-radius: 5px 5px 0 0;
            font-size: 24px;
          }
          .content {
            padding: 20px;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #999;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${icon} ${title}
          </div>
          <div class="content">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <div class="footer">
            This is an automated message from SSL Monitor. Please do not reply to this email.
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Send email
    const mailOptions = {
      from: preferences.email.from || preferences.email.user,
      to: preferences.email.to,
      subject: subject,
      text: message,
      html: htmlMessage
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    if (info && info.messageId) {
      logger.info(`Email notification sent successfully for type: ${type}, message ID: ${info.messageId}`);
      return true;
    } else {
      logger.error('Email notification failed');
      return false;
    }
  } catch (error) {
    logger.error('Error sending email notification:', error);
    return false;
  }
};

// Send notification based on preferences
const sendNotification = async (subject, message, type = NOTIFICATION_TYPES.SSL_EXPIRY_WARNING) => {
  const preferences = getNotificationPreferences();
  let results = { telegram: false, email: false };
  
  try {
    // Send based on preference
    if (preferences.channel === NOTIFICATION_CHANNELS.TELEGRAM || preferences.channel === NOTIFICATION_CHANNELS.BOTH) {
      results.telegram = await sendTelegramNotification(message, type);
    }
    
    if (preferences.channel === NOTIFICATION_CHANNELS.EMAIL || preferences.channel === NOTIFICATION_CHANNELS.BOTH) {
      results.email = await sendEmailNotification(subject, message, type);
    }
    
    // Log results
    const telegramStatus = results.telegram ? 'success' : 'failed';
    const emailStatus = results.email ? 'success' : 'failed';
    logger.info(`Notification sent: Telegram (${telegramStatus}), Email (${emailStatus})`);
    
    return results;
  } catch (error) {
    logger.error('Error sending notification:', error);
    return results;
  }
};

// Test notifications
const testNotifications = async () => {
  try {
    const preferences = getNotificationPreferences();
    const testMessage = 'This is a test notification from SSL Monitor. If you receive this, your notification settings are configured correctly.';
    const results = { telegram: false, email: false };
    
    // Test Telegram if enabled
    if (preferences.telegram.enabled) {
      results.telegram = await sendTelegramNotification(testMessage, NOTIFICATION_TYPES.SSL_EXPIRY_WARNING);
    }
    
    // Test Email if enabled
    if (preferences.email.enabled) {
      results.email = await sendEmailNotification('SSL Monitor Test Notification', testMessage, NOTIFICATION_TYPES.SSL_EXPIRY_WARNING);
    }
    
    return {
      success: results.telegram || results.email,
      telegram: {
        enabled: preferences.telegram.enabled,
        success: results.telegram
      },
      email: {
        enabled: preferences.email.enabled,
        success: results.email
      },
      message: 'Test notification sent'
    };
  } catch (error) {
    logger.error('Error testing notifications:', error);
    return {
      success: false,
      message: `Error testing notifications: ${error.message}`
    };
  }
};

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  sendNotification,
  testNotifications
}; 