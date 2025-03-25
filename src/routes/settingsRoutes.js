const express = require('express');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

// Tüm ayarları getir
router.get('/', settingsController.getSettings);

// Telegram ayarlarını güncelle
router.put('/telegram', settingsController.updateTelegramSettings);

// Telegram bot ayarlarını test et
router.post('/telegram/test', settingsController.testTelegramBot);

// Zamanlama ayarlarını güncelle
router.put('/schedule', settingsController.updateScheduleSettings);

// Zamanlama bilgisini getir
router.get('/schedule', settingsController.getScheduleInfo);

// Manuel olarak SSL kontrolü başlat
router.post('/run-check', settingsController.runSSLCheckNow);

module.exports = router; 