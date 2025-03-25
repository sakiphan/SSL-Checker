const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { createSslCheckService } = require('./sslCheckService');
const domainDiscoveryService = require('./domainDiscoveryService');
const { createSecurityService, checkSslSecurity } = require('./sslSecurityService');
const settingsService = require('./settingsService');

// Path to websites file
const WEBSITES_FILE = path.join(__dirname, '../data/websites.json');

// Status colors
const STATUS_COLORS = {
  VALID: {
    color: '#4CAF50', // Green
    textColor: '#FFFFFF'
  },
  WARNING: {
    color: '#FFC107', // Amber
    textColor: '#000000'
  },
  EXPIRED: {
    color: '#F44336', // Red
    textColor: '#FFFFFF'
  },
  UNKNOWN: {
    color: '#9E9E9E', // Gray
    textColor: '#FFFFFF'
  }
};

// Security grade colors
const GRADE_COLORS = {
  'A+': '#4CAF50', // Green
  'A': '#8BC34A', // Light Green
  'B': '#CDDC39', // Lime
  'C': '#FFC107', // Amber
  'D': '#FF9800', // Orange
  'F': '#F44336'  // Red
};

// Ensure the data directory exists
const ensureDataDirectoryExists = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Initialize websites file if it doesn't exist
const initializeWebsites = () => {
  ensureDataDirectoryExists();
  
  if (!fs.existsSync(WEBSITES_FILE)) {
    fs.writeFileSync(WEBSITES_FILE, JSON.stringify([], null, 2));
    logger.info('Websites file initialized');
  }
};

// Get all websites
const getAllWebsites = () => {
  try {
    initializeWebsites();
    
    const websitesData = fs.readFileSync(WEBSITES_FILE, 'utf8');
    return JSON.parse(websitesData);
  } catch (error) {
    logger.error('Error reading websites:', error);
    return [];
  }
};

// Get website by ID
const getWebsiteById = (id) => {
  try {
    logger.info(`Getting website by ID: ${id}`);
    
    if (!id) {
      logger.warn('getWebsiteById called with no ID');
      return null;
    }
    
    const websites = getAllWebsites();
    
    // ID her zaman string olmalı, karşılaştırma için normalize et
    const stringId = String(id);
    
    const website = websites.find(website => String(website.id) === stringId);
    
    if (!website) {
      logger.warn(`Website with ID ${id} not found`);
      return null;
    }
    
    logger.info(`Website found: ${website.url}`);
    return website;
  } catch (error) {
    logger.error(`Error getting website by ID ${id}:`, error);
    return null;
  }
};

// Get website by URL
const getWebsiteByUrl = (url) => {
  const websites = getAllWebsites();
  return websites.find(website => website.url.toLowerCase() === url.toLowerCase());
};

// Get SSL status from certificate details
const getSslStatus = (sslDetails) => {
  if (!sslDetails) {
    return 'UNKNOWN';
  }
  
  if (!sslDetails.valid) {
    return 'EXPIRED';
  }
  
  const settings = settingsService.getSettings();
  const warningDays = settings.warningDays || 30;
  const now = new Date();
  const expiryDate = new Date(sslDetails.expiresAt);
  const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining <= warningDays) {
    return 'WARNING';
  }
  
  return 'VALID';
};

// Get color style for status
const getStatusStyle = (status) => {
  return STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
};

// Add notification entry to website
const addNotification = (websiteId, notification) => {
  try {
    const website = getWebsiteById(websiteId);
    
    if (!website) {
      throw new Error('Website not found');
    }
    
    const notificationEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      type: notification.type,
      message: notification.message
    };
    
    const notifications = website.notifications || [];
    notifications.push(notificationEntry);
    
    // Keep only the last 20 notifications
    if (notifications.length > 20) {
      notifications.sort((a, b) => b.timestamp - a.timestamp);
      notifications.length = 20;
    }
    
    updateWebsite(websiteId, { notifications });
    
    return notificationEntry;
  } catch (error) {
    logger.error('Error adding notification:', error);
    throw error;
  }
};

// Website işlevlerini oluştur
const websiteServiceFunctions = {
  getAllWebsites,
  getWebsiteById,
  getWebsiteByUrl,
  updateWebsite: (id, updatedData) => {
    try {
      const websites = getAllWebsites();
      const index = websites.findIndex(website => website.id === id);
      
      if (index === -1) {
        throw new Error('Website not found');
      }
      
      // Update website object
      const updatedWebsite = {
        ...websites[index],
        ...updatedData
      };
      
      // Ensure ID isn't changed
      updatedWebsite.id = id;
      
      // Update status color if SSL status changed
      if (updatedData.sslStatus && updatedData.sslStatus !== websites[index].sslStatus) {
        const statusStyle = getStatusStyle(updatedData.sslStatus);
        updatedWebsite.sslStatusColor = statusStyle.color;
        updatedWebsite.sslStatusTextColor = statusStyle.textColor;
      }
      
      websites[index] = updatedWebsite;
      fs.writeFileSync(WEBSITES_FILE, JSON.stringify(websites, null, 2));
      
      return updatedWebsite;
    } catch (error) {
      logger.error('Error updating website:', error);
      throw error;
    }
  },
  getSslStatus,
  addNotification
};

// SSL Checker servisini oluştur
const sslCheckService = createSslCheckService(websiteServiceFunctions);

// Security servisini oluştur
const securityService = createSecurityService(websiteServiceFunctions);

// Update website
const updateWebsite = websiteServiceFunctions.updateWebsite;

// Add new website
const addWebsite = async (websiteData) => {
  try {
    logger.info(`Adding website: ${websiteData.url}`);
    
    if (!websiteData || !websiteData.url) {
      logger.error('Invalid website data: missing URL');
      throw new Error('Website URL is required');
    }
    
    const websites = getAllWebsites();
    logger.info(`Current website count: ${websites.length}`);
    
    // Check if URL already exists
    const existingWebsite = websites.find(website => 
      website.url && website.url.toLowerCase() === websiteData.url.toLowerCase()
    );
    
    if (existingWebsite) {
      logger.warn(`Website with URL ${websiteData.url} already exists`);
      throw new Error('Website with this URL already exists');
    }
    
    // Create new website object
    const newWebsite = {
      id: uuidv4(),
      url: websiteData.url,
      name: websiteData.name || websiteData.url,
      description: websiteData.description || '',
      tags: websiteData.tags || [],
      addedAt: Date.now(),
      lastCheck: null,
      sslDetails: null,
      sslStatus: 'UNKNOWN',
      sslStatusColor: STATUS_COLORS.UNKNOWN.color,
      sslStatusTextColor: STATUS_COLORS.UNKNOWN.textColor,
      sslGrade: null,
      securityScore: null,
      securityDetails: null,
      notifications: [],
      notificationsEnabled: websiteData.notificationsEnabled !== undefined ? websiteData.notificationsEnabled : true,
      isSubdomain: websiteData.isSubdomain || false,
      parentDomain: websiteData.parentDomain || null
    };
    
    // Önce websitesini ekle
    logger.info(`Saving website ${newWebsite.name} to database, ID: ${newWebsite.id}`);
    
    try {
      websites.push(newWebsite);
      fs.writeFileSync(WEBSITES_FILE, JSON.stringify(websites, null, 2));
      logger.info(`Website saved successfully: ${newWebsite.url}`);
    } catch (writeError) {
      logger.error(`Error writing to websites file: ${writeError.message}`, writeError);
      throw new Error(`Failed to save website: ${writeError.message}`);
    }
    
    // SSL kontrolünü yap, ancak ana işlemin tamamlanmasını engelleme
    if (!websiteData.skipSslCheck) {
      logger.info(`Scheduling background SSL check for website ID: ${newWebsite.id}`);
      // Website id'sini string olarak geç
      setTimeout(() => {
        checkWebsiteSsl(newWebsite.id)
          .then(result => {
            logger.info(`Background SSL check completed for ${newWebsite.url}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
          })
          .catch(error => {
            logger.error(`Background SSL check error for ${newWebsite.url}:`, error);
          });
      }, 100);
    }
    
    // Alt alan keşfini burada yapmayın, sadece ana websiteyi döndürün
    if (websiteData.isSubdomain === false && !websiteData.skipDiscovery) {
      logger.info(`Scheduling subdomain discovery for ${newWebsite.url}`);
      scheduleSubdomainDiscovery(newWebsite);
    }
    
    return newWebsite;
  } catch (error) {
    logger.error('Error adding website:', error);
    throw error;
  }
};

// SSL kontrol sürecini yeni bir fonksiyona taşıyalım
const checkWebsiteSsl = async (websiteId) => {
  try {
    // websiteId bir nesne olarak geçirilmiş olabilir, bunu string'e çevirelim
    if (typeof websiteId === 'object' && websiteId !== null) {
      logger.warn(`websiteId bir nesne olarak gönderildi, ID'yi çıkarmaya çalışıyorum`);
      websiteId = websiteId.id || websiteId.toString();
    }
    
    logger.info(`Checking SSL for website ID: ${websiteId}`);
    
    // Web sitesini bul
    const website = getWebsiteById(websiteId);
    if (!website) {
      logger.warn(`Website with ID ${websiteId} not found`);
      return { 
        success: false,
        error: 'Website not found'
      };
    }
    
    const url = website.url;
    logger.info(`SSL check started for URL: ${url}`);
    
    try {
      // SSL kontrolü yap
      const sslResult = await sslCheckService.checkWebsiteSSL(url);
      logger.info(`SSL check result for ${url}: ${JSON.stringify(sslResult)}`);
      
      // Websitenin SSL durumunu güncelle
      const updatedWebsite = updateWebsite(websiteId, {
        sslDetails: sslResult,
        sslStatus: getSslStatus(sslResult),
        lastCheck: Date.now()
      });
      
      // Güvenlik kontrolü de yapılmalı mı?
      try {
        const settings = settingsService.getSettings();
        logger.info(`Settings for security check: ${JSON.stringify(settings)}`);
        
        // "enableSecurityCheck" ayarını kontrol et
        if (settings && settings.enableSecurityCheck === true) {
          logger.info(`Running security check for ${url} based on enableSecurityCheck setting`);
          
          // Güvenlik kontrolü yap
          const securityResult = await securityService.checkSslSecurity(url);
          
          if (securityResult) {
            // Güvenlik bilgilerini güncelle
            updateWebsite(websiteId, {
              sslGrade: securityResult.grade,
              securityScore: securityResult.score,
              securityDetails: JSON.stringify(securityResult)
            });
            
            logger.info(`Security check completed for ${url}: Grade ${securityResult.grade}, Score ${securityResult.score}`);
          }
        } else {
          logger.info(`Security check skipped for ${url} - enableSecurityCheck is disabled`);
        }
      } catch (secError) {
        logger.error(`Error during security check for ${url}:`, secError);
        // Güvenlik kontrolü başarısız olsa da genel işlemi devam ettir
      }
      
      return {
        success: true,
        website: updatedWebsite,
        sslResult
      };
      
    } catch (sslError) {
      // SSL kontrolü sırasında hata
      logger.error(`SSL check error for ${url}:`, sslError);
      
      // Hata olsa da durumu güncelle (geçersiz olarak)
      updateWebsite(websiteId, {
        sslStatus: 'UNKNOWN',
        lastCheck: Date.now(),
        sslDetails: {
          valid: false,
          error: sslError.message || 'SSL check failed'
        }
      });
      
      return {
        success: false,
        error: sslError.message || 'SSL check failed',
        website
      };
    }
    
  } catch (error) {
    logger.error(`Error in checkWebsiteSsl:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error during SSL check'
    };
  }
};

// Alt alan keşfini arka planda planlayan fonksiyon
const scheduleSubdomainDiscovery = (website) => {
  const settings = settingsService.getSettings();
  
  if (!settings.enableAutoDiscovery) {
    return; // Alt alan keşfi kapalıysa hiçbir şey yapma
  }
  
  setTimeout(async () => {
    try {
      const domain = new URL(website.url).hostname;
      logger.info(`Starting subdomain discovery for ${domain}`);
      
      // Alt alanları keşfet
      const discoveryResult = await domainDiscoveryService.addDiscoveredDomainsToMonitoring(
        domain,
        website.name
      );
      
      // Bulunan alt alanları ekle
      if (discoveryResult && discoveryResult.domains && discoveryResult.domains.length > 0) {
        logger.info(`Processing ${discoveryResult.domains.length} discovered domains for ${domain}`);
        
        let added = 0;
        let existing = 0;
        let failed = 0;
        
        for (const discoveredDomain of discoveryResult.domains) {
          try {
            const websiteUrl = `https://${discoveredDomain}`;
            
            // Varolan websitelerde bu URL var mı kontrol et
            const allWebsites = getAllWebsites();
            const existingWebsite = allWebsites.find(site => 
              site.url.toLowerCase() === websiteUrl.toLowerCase()
            );
            
            if (existingWebsite) {
              logger.info(`Domain ${discoveredDomain} already exists in monitoring`);
              existing++;
              continue;
            }
            
            // Create a name for the subdomain
            const subdomainName = `${website.name} (${discoveredDomain})`;
            
            // Alt alanı ekle, ancak SSL kontrolü ve alt alan keşfi yinelemeyi önle
            logger.info(`Adding subdomain ${discoveredDomain} to monitoring`);
            await addWebsite({
              url: websiteUrl,
              name: subdomainName,
              notificationsEnabled: true,
              isSubdomain: true,
              parentDomain: domain,
              skipDiscovery: true // Alt alan için yeniden keşif yapmayı önle
            });
            
            added++;
          } catch (error) {
            logger.error(`Error adding discovered domain ${discoveredDomain}:`, error);
            failed++;
          }
        }
        
        logger.info(`Subdomain discovery completed for ${domain}: ${added} added, ${existing} existing, ${failed} failed`);
      }
    } catch (error) {
      logger.error(`Error in subdomain discovery process for ${website.url}:`, error);
    }
  }, 2000); // Biraz daha uzun bekleyelim, böylece ana website tam olarak kaydedilsin
};

// Update SSL information
const updateSslInfo = (id, sslExpiryDate) => {
  return updateWebsite(id, {
    sslExpiryDate,
    lastCheck: new Date().toISOString()
  });
};

// Delete website
const deleteWebsite = (id) => {
  try {
    const websites = getAllWebsites();
    const updatedWebsites = websites.filter(website => website.id !== id);
    
    if (updatedWebsites.length === websites.length) {
      throw new Error('Website not found');
    }
    
    fs.writeFileSync(WEBSITES_FILE, JSON.stringify(updatedWebsites, null, 2));
    return true;
  } catch (error) {
    logger.error('Error deleting website:', error);
    throw error;
  }
};

// Get color for security grade
const getGradeColor = (grade) => {
  return GRADE_COLORS[grade] || GRADE_COLORS.F;
};

module.exports = {
  getAllWebsites,
  getWebsiteById,
  getWebsiteByUrl,
  addWebsite,
  updateWebsite: websiteServiceFunctions.updateWebsite,
  updateSslInfo,
  deleteWebsite,
  getSslStatus,
  getStatusStyle,
  getGradeColor,
  addNotification,
  STATUS_COLORS,
  GRADE_COLORS,
  sslCheckService,  // SSL Checker servisi dışarıya ver
  securityService   // Security servisi dışarıya ver
}; 