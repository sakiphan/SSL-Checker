const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// Get all websites
const getAllWebsites = () => {
  return db.get('websites').value();
};

// Get website by ID
const getWebsiteById = (id) => {
  return db.get('websites').find({ id }).value();
};

// Get website by URL
const getWebsiteByUrl = (url) => {
  return db.get('websites').find({ url }).value();
};

// Add new website
const addWebsite = (websiteData) => {
  const website = {
    id: uuidv4(),
    url: websiteData.url,
    name: websiteData.name,
    sslExpiryDate: websiteData.sslExpiryDate || null,
    lastChecked: websiteData.lastChecked || null,
    notificationsEnabled: websiteData.notificationsEnabled !== false,
    notificationsSent: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.get('websites').push(website).write();
  return website;
};

// Update website
const updateWebsite = (id, updateData) => {
  updateData.updatedAt = new Date().toISOString();
  
  db.get('websites')
    .find({ id })
    .assign(updateData)
    .write();
  
  return getWebsiteById(id);
};

// Update SSL information
const updateSslInfo = (id, sslExpiryDate) => {
  return updateWebsite(id, {
    sslExpiryDate,
    lastChecked: new Date().toISOString()
  });
};

// Add notification record
const addNotificationRecord = (id, daysRemaining) => {
  const website = getWebsiteById(id);
  if (!website) return null;
  
  const notification = {
    date: new Date().toISOString(),
    daysRemaining
  };
  
  website.notificationsSent.push(notification);
  
  return updateWebsite(id, {
    notificationsSent: website.notificationsSent
  });
};

// Delete website
const deleteWebsite = (id) => {
  return db.get('websites').remove({ id }).write();
};

module.exports = {
  getAllWebsites,
  getWebsiteById,
  getWebsiteByUrl,
  addWebsite,
  updateWebsite,
  updateSslInfo,
  addNotificationRecord,
  deleteWebsite
}; 