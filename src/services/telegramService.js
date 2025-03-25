const TelegramBot = require('node-telegram-bot-api');
const db = require('../utils/db');

const getBotSettings = () => {
  const settings = db.get('settings').value();
  return {
    token: settings.telegramBotToken,
    channelId: settings.telegramChannelId
  };
};

const updateBotSettings = (token, channelId) => {
  db.get('settings')
    .assign({
      telegramBotToken: token,
      telegramChannelId: channelId
    })
    .write();
  
  initBot();
  
  return getBotSettings();
};

let bot = null;

const initBot = () => {
  const { token } = getBotSettings();
  
  if (!token) {
    console.warn('Telegram bot could not be started: Token not found');
    return null;
  }
  
  try {
    if (bot) {
      bot.close();
    }
    
    bot = new TelegramBot(token, { polling: false });
    console.log('Telegram bot started');
    
    return bot;
  } catch (error) {
    console.error('Telegram bot start error:', error);
    return null;
  }
};

initBot();

const sendMessage = async (message) => {
  const { channelId, token } = getBotSettings();
  
  if (!token || !channelId) {
    console.error('Telegram message could not be sent: Bot token or channel ID not found');
    return false;
  }
  
  try {
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