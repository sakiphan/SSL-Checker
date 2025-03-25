const websiteService = require('../services/websiteService');
const sslCheckerService = require('../services/sslCheckerService');

// Tüm websiteleri getir
const getAllWebsites = (req, res) => {
  try {
    const websites = websiteService.getAllWebsites();
    res.json({ success: true, websites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Website detayını getir
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

// Yeni website ekle
const addWebsite = (req, res) => {
  try {
    const { url, name, notificationsEnabled } = req.body;
    
    if (!url || !name) {
      return res.status(400).json({ success: false, error: 'URL and name fields are required' });
    }
    
    // URL formatını kontrol et
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Please enter a valid URL' });
    }
    
    // Aynı URL ile kayıtlı website var mı kontrol et
    const existingWebsite = websiteService.getWebsiteByUrl(url);
    if (existingWebsite) {
      return res.status(400).json({ success: false, error: 'A website with this URL already exists' });
    }
    
    const website = websiteService.addWebsite({
      url,
      name,
      notificationsEnabled: notificationsEnabled !== false
    });
    
    // SSL bilgilerini kontrol et ve güncelle
    sslCheckerService.checkWebsiteSSL(website).catch(err => {
      console.error(`SSL check error for newly added website: ${url}`, err);
    });
    
    res.status(201).json({ success: true, website });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Website güncelle
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

// Website sil
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

// Website SSL durumunu kontrol et
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