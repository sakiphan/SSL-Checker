const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

// Set the database file path
const dbPath = path.join(__dirname, '../../data');
const adapter = new FileSync(path.join(dbPath, 'db.json'));
const db = low(adapter);

// Set default database schema
db.defaults({ 
  websites: [],
  settings: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || '',
    checkInterval: process.env.CHECK_INTERVAL || '0 0 * * *' // Every day at midnight
  } 
}).write();

module.exports = db; 