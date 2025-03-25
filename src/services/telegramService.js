const TelegramBot = require('node-telegram-bot-api');
const db = require('../utils/db');

// Get bot token and channel ID
const getBotSettings = () => {
  const settings = db.get('settings').value();
  return {
    token: settings.telegramBotToken,
    channelId: settings.telegramChannelId
  };
};

// Update bot settings
const updateBotSettings = (token, channelId) => {
  db.get('settings')
    .assign({
      telegramBotToken: token,
      telegramChannelId: channelId
    })
    .write();
  
  // Restart bot with new settings
  initBot();
  
  return getBotSettings();
};

// Bot instance variable
let bot = null;

// Initialize the bot
const initBot = () => {
  const { token } = getBotSettings();
  
  if (!token) {
    console.warn('Telegram bot could not be started: Token not found');
    return null;
  }
  
  try {
    // Close existing bot instance
    if (bot) {
      bot.close();
    }
    
    // Create new bot instance
    bot = new TelegramBot(token, { polling: false });
    console.log('Telegram bot started');
    
    return bot;
  } catch (error) {
    console.error('Telegram bot start error:', error);
    return null;
  }
};

// Initialize bot on startup
initBot();

// Send message to Telegram channel
const sendMessage = async (message) => {
  const { channelId, token } = getBotSettings();
  
  if (!token || !channelId) {
    console.error('Telegram message could not be sent: Bot token or channel ID not found');
    return false;
  }
  
  try {
    // Reinitialize bot if instance doesn't exist
    if (!bot) {
      initBot();
    }
    
    await bot.sendMessage(channelId, message, { parse_mode: 'HTML' });
    console.log('Telegram message sent');
    return true;
  } catch (error) {
    console.error('Telegram message sending error:', error);
    return false;
  }
};

// Test if bot is working
const testBot = async () => {
  const { token, channelId } = getBotSettings();
  
  if (!token || !channelId) {
    return {
      success: false,
      error: 'Bot token or channel ID not found'
    };
  }
  
  try {
    if (!bot) {
      initBot();
    }
    
    const testMessage = '🧪 SSL Monitor Test Message: Bot is working!';
    await bot.sendMessage(channelId, testMessage);
    
    return {
      success: true,
      message: 'Test message sent successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'An error occurred while sending test message'
    };
  }
};

module.exports = {
  getBotSettings,
  updateBotSettings,
  sendMessage,
  testBot
}; 