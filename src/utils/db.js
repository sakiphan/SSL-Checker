const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

// Veritabanı dosyasının yolunu belirleme
const dbPath = path.join(__dirname, '../../data');
const adapter = new FileSync(path.join(dbPath, 'db.json'));
const db = low(adapter);

// Varsayılan veritabanı şemasını ayarla
db.defaults({ 
  websites: [],
  settings: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || '',
    checkInterval: process.env.CHECK_INTERVAL || '0 0 * * *' // Her gün gece yarısı
  } 
}).write();

module.exports = db; 