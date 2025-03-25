const websiteService = require('../services/websiteService');
// const sslCheckService = require('../services/sslCheckService');  // Bu import'a gerek kalmadı
const logger = require('../utils/logger');

// Get all websites
const getAllWebsites = (req, res) => {
  try {
    const websites = websiteService.getAllWebsites();
    res.json({ success: true, websites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get website details
const getWebsiteById = (req, res) => {
  try {
    const { id } = req.params;
    const website = websiteService.getWebsiteById(id);
    
    if (!website) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }
    
    res.json({ success: true, website });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add new website
const addWebsite = async (req, res) => {
  try {
    const { url, name, notificationsEnabled, description, tags } = req.body;
    
    if (!url || !name) {
      return res.status(400).json({ success: false, error: 'URL and name fields are required' });
    }
    
    // Check URL format
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Please enter a valid URL' });
    }
    
    // Create and add website (SSL check will happen inside addWebsite)
    const website = await websiteService.addWebsite({
      url,
      name,
      description,
      tags,
      notificationsEnabled: notificationsEnabled !== false
    });
    
    res.status(201).json({ success: true, website });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update website
const updateWebsite = (req, res) => {
  try {
    const { id } = req.params;
    const { name, notificationsEnabled } = req.body;
    
    const website = websiteService.getWebsiteById(id);
    if (!website) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }
    
    const updateData = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }
    
    if (notificationsEnabled !== undefined) {
      updateData.notificationsEnabled = notificationsEnabled;
    }
    
    const updatedWebsite = websiteService.updateWebsite(id, updateData);
    res.json({ success: true, website: updatedWebsite });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete website
const deleteWebsite = (req, res) => {
  try {
    const { id } = req.params;
    
    const website = websiteService.getWebsiteById(id);
    if (!website) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }
    
    websiteService.deleteWebsite(id);
    res.json({ success: true, message: 'Website successfully deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Check website SSL status
const checkSSL = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`SSL check requested for website ID: ${id}`);
    
    const website = websiteService.getWebsiteById(id);
    if (!website) {
      logger.warn(`Website with ID ${id} not found`);
      return res.status(404).json({
        success: false,
        error: 'Website not found'
      });
    }
    
    logger.info(`Starting SSL check for ${website.url}`);
    
    // SSL check'i URL ile yap, tüm website nesnesi değil
    const result = await websiteService.sslCheckService.checkWebsiteSSL(website.url);
    
    if (result.error) {
      logger.warn(`SSL check resulted in error: ${result.error}`);
      // Başarılı gibi döndür ama hata mesajını da ver
      return res.json({
        success: false,
        error: result.error,
        website: website
      });
    }
    
    // SSL bilgilerini güncelleyelim
    const updatedWebsite = websiteService.updateWebsite(id, {
      sslDetails: result,
      sslStatus: websiteService.getSslStatus(result),
      lastCheck: Date.now()
    });
    
    logger.info(`SSL check completed successfully for ${website.url}`);
    res.json({
      success: true,
      result,
      website: updatedWebsite
    });
  } catch (error) {
    logger.error(`Error in checkSSL controller for website ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getAllWebsites,
  getWebsiteById,
  addWebsite,
  updateWebsite,
  deleteWebsite,
  checkSSL
}; 