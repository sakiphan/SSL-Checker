const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// Tüm websiteleri getir
const getAllWebsites = () => {
  return db.get('websites').value();
};

// ID'ye göre website getir
const getWebsiteById = (id) => {
  return db.get('websites').find({ id }).value();
};

// URL'ye göre website getir
const getWebsiteByUrl = (url) => {
  return db.get('websites').find({ url }).value();
};

// Yeni website ekle
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

// Website güncelle
const updateWebsite = (id, updateData) => {
  updateData.updatedAt = new Date().toISOString();
  
  db.get('websites')
    .find({ id })
    .assign(updateData)
    .write();
  
  return getWebsiteById(id);
};

// SSL kontrol sonuçlarını güncelle
const updateSslInfo = (id, sslExpiryDate) => {
  return updateWebsite(id, {
    sslExpiryDate,
    lastChecked: new Date().toISOString()
  });
};

// Bildirim kaydı ekle
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

// Website sil
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