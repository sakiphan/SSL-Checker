const express = require('express');
const websiteController = require('../controllers/websiteController');

const router = express.Router();

// Get all websites
router.get('/', websiteController.getAllWebsites);

// Get website by ID
router.get('/:id', websiteController.getWebsiteById);

// Add new website
router.post('/', websiteController.addWebsite);

// Update website
router.put('/:id', websiteController.updateWebsite);

// Delete website
router.delete('/:id', websiteController.deleteWebsite);

// Check website SSL
router.get('/:id/check-ssl', websiteController.checkSSL);

module.exports = router; 