const websiteService = require('../services/websiteService');
const sslCheckerService = require('../services/sslCheckerService');

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
const addWebsite = (req, res) => {
  try {
    const { url, name, notificationsEnabled } = req.body;
    
    if (!url || !name) {
      return res.status(400).json({ success: false, error: 'URL and name fields are required' });
    }
    
    // Check URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Please enter a valid URL' });
    }
    
    // Check if website with same URL already exists
    const existingWebsite = websiteService.getWebsiteByUrl(url);
    if (existingWebsite) {
      return res.status(400).json({ success: false, error: 'A website with this URL already exists' });
    }
    
    const website = websiteService.addWebsite({
      url,
      name,
      notificationsEnabled: notificationsEnabled !== false
    });
    
    // Check and update SSL information
    sslCheckerService.checkWebsiteSSL(website).catch(err => {
      console.error(`SSL check error for newly added website: ${url}`, err);
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
    
    const website = websiteService.getWebsiteById(id);
    if (!website) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }
    
    const result = await sslCheckerService.checkWebsiteSSL(website);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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