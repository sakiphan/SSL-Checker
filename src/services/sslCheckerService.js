const sslChecker = require('ssl-checker');
const moment = require('moment');
const websiteService = require('./websiteService');
const telegramService = require('./telegramService');

const checkWebsiteSSL = async (website) => {
  try {
    const domain = new URL(website.url).hostname;
    
    const sslInfo = await sslChecker(domain);
    
    if (sslInfo && sslInfo.valid) {
      const expiryDate = new Date(Date.now() + (sslInfo.daysRemaining * 24 * 60 * 60 * 1000));
      websiteService.updateSslInfo(website.id, expiryDate.toISOString());
      
      checkAndSendNotification(website.id, sslInfo.daysRemaining);
      
      return {
        success: true,
        daysRemaining: sslInfo.daysRemaining,
        expiryDate: expiryDate.toISOString()
      };
    } else {
      return {
        success: false,
        error: 'SSL certificate is not valid'
      };
    }
  } catch (error) {
    console.error(`Error during SSL check: ${website.url}`, error);
    return {
      success: false,
      error: error.message || 'Unknown error during SSL check'
    };
  }
};

const checkAllWebsites = async () => {
  console.log('Started SSL check for all websites');
  const websites = websiteService.getAllWebsites();
  
  const results = {
    total: websites.length,
    success: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  for (const website of websites) {
    if (!website.notificationsEnabled) {
      results.skipped++;
      results.details.push({
        url: website.url,
        status: 'skipped',
        reason: 'Notifications disabled'
      });
      continue;
    }
    
    const checkResult = await checkWebsiteSSL(website);
    
    if (checkResult.success) {
      results.success++;
      results.details.push({
        url: website.url,
        status: 'success',
        daysRemaining: checkResult.daysRemaining
      });
    } else {
      results.failed++;
      results.details.push({
        url: website.url,
        status: 'failed',
        error: checkResult.error
      });
    }
  }
  
  console.log(`SSL check completed: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`);
  return results;
};

const checkAndSendNotification = (websiteId, daysRemaining) => {
  const website = websiteService.getWebsiteById(websiteId);
  
  if (!website || !website.notificationsEnabled) {
    return false;
  }
  
  if (daysRemaining <= 15) {
    const today = moment().startOf('day');
    const alreadySentToday = website.notificationsSent.some(notification => {
      const notificationDate = moment(notification.date).startOf('day');
      return notificationDate.isSame(today) && notification.daysRemaining === daysRemaining;
    });
    
    if (!alreadySentToday) {
      const notificationMessage = `⚠️ SSL Certificate Alert ⚠️\n\nWebsite: ${website.name}\nURL: ${website.url}\n${daysRemaining} days remaining until SSL certificate expiration!`;
      
      telegramService.sendMessage(notificationMessage);
      
      websiteService.addNotificationRecord(websiteId, daysRemaining);
      
      return true;
    }
  }
  
  return false;
};

module.exports = {
  checkWebsiteSSL,
  checkAllWebsites,
  checkAndSendNotification
}; 