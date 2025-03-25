const express = require('express');
const websiteController = require('../controllers/websiteController');

const router = express.Router();

// Tüm websiteleri getir
router.get('/', websiteController.getAllWebsites);

// Website detayını getir
router.get('/:id', websiteController.getWebsiteById);

// Yeni website ekle
router.post('/', websiteController.addWebsite);

// Website güncelle
router.put('/:id', websiteController.updateWebsite);

// Website sil
router.delete('/:id', websiteController.deleteWebsite);

// Website SSL durumunu kontrol et
router.get('/:id/check-ssl', websiteController.checkSSL);

module.exports = router; 