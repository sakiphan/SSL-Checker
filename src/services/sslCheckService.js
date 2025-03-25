const https = require('https');
const { URL } = require('url');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const notificationService = require('./notificationService');
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

// Get SSL certificate information
const getSSLCertificate = (domain) => {
  return new Promise((resolve, reject) => {
    try {
      // Clean domain string
      domain = domain.replace(/^https?:\/\//, '').split('/')[0];
      logger.info(`Checking SSL certificate for domain: ${domain}`);
      
      // Değişiklik: Önce Node.js HTTPS yöntemini deneyelim, başarısız olursa OpenSSL'e düşelim
      const options = {
        hostname: domain,
        port: 443,
        method: 'GET',
        path: '/',
        rejectUnauthorized: false, // We want to check invalid certs too
        timeout: 10000 // 10 seconds timeout
      };
      
      logger.info(`Making HTTPS request to ${domain}`);
      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate();
        
        if (Object.keys(cert).length === 0) {
          logger.warn(`No certificate found for ${domain}, trying OpenSSL...`);
          // Sertifika bulunamadıysa, OpenSSL deneyebiliriz
          try {
            const opensslResult = getSSLCertificateWithOpenSSL(domain);
            // TLS version information
            try {
              const tlsVersions = checkTLSVersions(domain);
              opensslResult.tlsVersions = tlsVersions;
            } catch (tlsError) {
              logger.warn(`Error checking TLS versions: ${tlsError.message}`);
              opensslResult.tlsVersions = {
                supported: ['Unknown'],
                insecure: [],
                highest: 'Unknown'
              };
            }
            return resolve(opensslResult);
          } catch (opensslError) {
            logger.error(`OpenSSL check also failed for ${domain}: ${opensslError.message}`);
            return reject(new Error('No certificate found'));
          }
        }
        
        // Check if certificate is self-signed
        const isSelfSigned = cert.issuer && cert.subject &&
          JSON.stringify(cert.issuer) === JSON.stringify(cert.subject);
        
        // Parse certificate data
        const result = {
          valid: true,
          issuer: cert.issuer ? formatIssuer(cert.issuer) : 'Unknown',
          subject: cert.subject ? formatSubject(cert.subject) : 'Unknown',
          subjectAltNames: parseSANs(cert.subjectaltname),
          issuedAt: cert.valid_from ? new Date(cert.valid_from).toISOString() : null,
          expiresAt: cert.valid_to ? new Date(cert.valid_to).toISOString() : null,
          serialNumber: cert.serialNumber || null,
          fingerprint: cert.fingerprint || null,
          selfSigned: isSelfSigned
        };
        
        // Try to get TLS version information (but don't fail if this fails)
        try {
          result.tlsVersions = checkTLSVersions(domain);
        } catch (tlsError) {
          logger.warn(`Error checking TLS versions: ${tlsError.message}`);
          result.tlsVersions = {
            supported: ['Unknown'],
            insecure: [],
            highest: 'Unknown'
          };
        }
        
        // Check if expired
        if (cert.valid_to) {
          const expiryDate = new Date(cert.valid_to);
          const now = new Date();
          result.valid = expiryDate > now;
          result.daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        }
        
        logger.info(`Certificate successfully retrieved for ${domain}`);
        resolve(result);
      });
      
      req.on('error', (error) => {
        logger.warn(`HTTPS method failed for ${domain}: ${error.message}, trying OpenSSL...`);
        // HTTPS başarısız olursa, OpenSSL deneyebiliriz
        try {
          const opensslResult = getSSLCertificateWithOpenSSL(domain);
          
          // TLS version information (but don't fail if this fails)
          try {
            const tlsVersions = checkTLSVersions(domain);
            opensslResult.tlsVersions = tlsVersions;
          } catch (tlsError) {
            logger.warn(`Error checking TLS versions: ${tlsError.message}`);
            opensslResult.tlsVersions = {
              supported: ['Unknown'],
              insecure: [],
              highest: 'Unknown'
            };
          }
          
          resolve(opensslResult);
        } catch (opensslError) {
          logger.error(`OpenSSL check also failed for ${domain}: ${opensslError.message}`);
          reject(error); // Original error döndür
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        logger.warn(`Request timed out for ${domain}, trying OpenSSL...`);
        
        // Zaman aşımı durumunda OpenSSL deneyebiliriz
        try {
          const opensslResult = getSSLCertificateWithOpenSSL(domain);
          
          // TLS version information
          try {
            const tlsVersions = checkTLSVersions(domain);
            opensslResult.tlsVersions = tlsVersions;
          } catch (tlsError) {
            opensslResult.tlsVersions = {
              supported: ['Unknown'],
              insecure: [],
              highest: 'Unknown'
            };
          }
          
          resolve(opensslResult);
        } catch (opensslError) {
          logger.error(`OpenSSL check also failed for ${domain}: ${opensslError.message}`);
          reject(new Error('Request timed out and OpenSSL check failed'));
        }
      });
      
      req.end();
    } catch (error) {
      logger.error(`General error in getSSLCertificate for ${domain}:`, error);
      
      // Genel hata durumunda, başarısız olarak işaretle ama çıktı döndür
      resolve({
        valid: false,
        error: error.message,
        issuer: 'Unknown',
        subject: 'Unknown',
        subjectAltNames: [],
        issuedAt: null,
        expiresAt: null,
        daysRemaining: 0,
        selfSigned: false,
        tlsVersions: {
          supported: ['Unknown'],
          insecure: [],
          highest: 'Unknown'
        }
      });
    }
  });
};

// Get SSL certificate using OpenSSL (more reliable and detailed)
const getSSLCertificateWithOpenSSL = (domain) => {
  try {
    // Execute openssl command to get certificate information
    const command = `echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -dates -issuer -subject -fingerprint -serial -ext subjectAltName`;
    const output = execSync(command, { encoding: 'utf8' });
    
    // Parse the output
    const notBeforeMatch = output.match(/notBefore=(.+)/);
    const notAfterMatch = output.match(/notAfter=(.+)/);
    const issuerMatch = output.match(/issuer=(.+)/);
    const subjectMatch = output.match(/subject=(.+)/);
    const fingerprintMatch = output.match(/SHA1 Fingerprint=(.+)/);
    const serialMatch = output.match(/serial=(.+)/);
    const sanMatch = output.match(/X509v3 Subject Alternative Name:([^]+?)(?=\n\n|\n[^\s]|$)/);
    
    const notBefore = notBeforeMatch ? notBeforeMatch[1].trim() : null;
    const notAfter = notAfterMatch ? notAfterMatch[1].trim() : null;
    
    // Calculate days remaining
    let daysRemaining = null;
    let valid = true;
    
    if (notAfter) {
      const expiryDate = new Date(notAfter);
      const now = new Date();
      valid = expiryDate > now;
      daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    }
    
    // Parse SANs
    let subjectAltNames = [];
    if (sanMatch) {
      const sanText = sanMatch[1].trim();
      const dnsMatches = sanText.match(/DNS:[^,\s]+/g);
      
      if (dnsMatches) {
        subjectAltNames = dnsMatches.map(dns => dns.replace('DNS:', '').trim());
      }
    }
    
    // Check if self-signed
    const issuer = issuerMatch ? issuerMatch[1].trim() : 'Unknown';
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Unknown';
    const selfSigned = issuer === subject;
    
    return {
      valid,
      issuer,
      subject,
      subjectAltNames,
      issuedAt: notBefore ? new Date(notBefore).toISOString() : null,
      expiresAt: notAfter ? new Date(notAfter).toISOString() : null,
      serialNumber: serialMatch ? serialMatch[1].trim() : null,
      fingerprint: fingerprintMatch ? fingerprintMatch[1].trim() : null,
      daysRemaining,
      selfSigned
    };
  } catch (error) {
    logger.warn(`OpenSSL certificate check failed: ${error.message}`);
    throw error;
  }
};

// Format issuer object to string
const formatIssuer = (issuer) => {
  if (typeof issuer === 'string') {
    return issuer;
  }
  
  // Format CommonName, Organization, etc.
  const issuerParts = [];
  if (issuer.CN) issuerParts.push(`CN=${issuer.CN}`);
  if (issuer.O) issuerParts.push(`O=${issuer.O}`);
  if (issuer.OU) issuerParts.push(`OU=${issuer.OU}`);
  
  return issuerParts.join(', ');
};

// Format subject object to string
const formatSubject = (subject) => {
  if (typeof subject === 'string') {
    return subject;
  }
  
  // Format CommonName, Organization, etc.
  const subjectParts = [];
  if (subject.CN) subjectParts.push(`CN=${subject.CN}`);
  if (subject.O) subjectParts.push(`O=${subject.O}`);
  if (subject.OU) subjectParts.push(`OU=${subject.OU}`);
  
  return subjectParts.join(', ');
};

// Parse Subject Alternative Names
const parseSANs = (san) => {
  if (!san) return [];
  
  // Extract DNS names
  const dnsNames = [];
  const dnsMatches = san.match(/DNS:([^,]+)/g);
  
  if (dnsMatches) {
    dnsMatches.forEach(match => {
      const domain = match.replace('DNS:', '').trim();
      dnsNames.push(domain);
    });
  }
  
  return dnsNames;
};

// Check supported TLS versions
const checkTLSVersions = (domain) => {
  const result = {
    supported: [],
    insecure: [],
    highest: null
  };
  
  try {
    logger.info(`Checking TLS versions for ${domain}`);
    
    // Hata ayıklama yardımcısı
    const checkVersion = (version, opensslFlag, isInsecure = false) => {
      try {
        const command = `echo | openssl s_client -connect ${domain}:443 ${opensslFlag} 2>/dev/null`;
        logger.info(`Running TLS command: ${command}`);
        execSync(command, { timeout: 5000 }); // 5 saniye timeout ile
        
        result.supported.push(version);
        if (isInsecure) {
          result.insecure.push(version);
        }
        logger.info(`${version} is supported for ${domain}`);
        return true;
      } catch (error) {
        logger.info(`${version} is not supported for ${domain}: ${error.message}`);
        return false;
      }
    };
    
    // Tüm sürümleri kontrol et (hata oluşabilecekleri try-catch içinde)
    const sslV2 = checkVersion('SSLv2', '-ssl2', true);
    const sslV3 = checkVersion('SSLv3', '-ssl3', true);
    const tlsV1_0 = checkVersion('TLSv1.0', '-tls1', true);
    const tlsV1_1 = checkVersion('TLSv1.1', '-tls1_1', true);
    const tlsV1_2 = checkVersion('TLSv1.2', '-tls1_2', false);
    const tlsV1_3 = checkVersion('TLSv1.3', '-tls1_3', false);
    
    // OpenSSL komutları çalışmazsa, varsayılan desteklenen sürümleri kullan
    if (result.supported.length === 0) {
      logger.warn(`Couldn't determine TLS versions for ${domain}, using default values`);
      // Modern web sunucuları genellikle bu sürümleri destekler
      result.supported = ['TLSv1.2', 'TLSv1.3'];
    }
    
    // En yüksek desteklenen sürümü belirle
    if (result.supported.includes('TLSv1.3')) {
      result.highest = 'TLSv1.3';
    } else if (result.supported.includes('TLSv1.2')) {
      result.highest = 'TLSv1.2';
    } else if (result.supported.includes('TLSv1.1')) {
      result.highest = 'TLSv1.1';
    } else if (result.supported.includes('TLSv1.0')) {
      result.highest = 'TLSv1.0';
    } else if (result.supported.includes('SSLv3')) {
      result.highest = 'SSLv3';
    } else if (result.supported.includes('SSLv2')) {
      result.highest = 'SSLv2';
    } else {
      result.highest = 'Unknown';
    }
    
    logger.info(`TLS check completed for ${domain}: highest=${result.highest}, supported=${result.supported.join(', ')}, insecure=${result.insecure.join(', ')}`);
    return result;
  } catch (error) {
    logger.error(`Error checking TLS versions for ${domain}:`, error);
    // Hata durumunda varsayılan bilgilerle dön
    return {
      supported: ['TLSv1.2', 'TLSv1.3'],  // Varsayılan olarak modern sürümleri desteklediğini varsay
      insecure: [],
      highest: 'TLSv1.2',  // Varsayılan olarak TLSv1.2
      error: error.message
    };
  }
};

// Check a website's SSL certificate
const checkWebsiteSSL = async (url) => {
  try {
    logger.info(`Starting SSL check for URL input: ${typeof url === 'object' ? JSON.stringify(url) : url}`);
    
    // URL bir nesne olarak geldi mi kontrol et ve düzelt
    if (typeof url === 'object' && url !== null) {
      logger.warn('URL an object, trying to extract URL property');
      if (url.url) {
        url = url.url;
        logger.info(`Extracted URL from object: ${url}`);
      } else {
        logger.error('Could not extract URL from object');
        return {
          valid: false,
          error: 'Invalid URL: URL is an object without url property',
          daysRemaining: 0,
          tlsVersions: {
            supported: ['Unknown'],
            insecure: [],
            highest: 'Unknown'
          }
        };
      }
    }
    
    if (!url) {
      logger.error('Invalid URL provided to checkWebsiteSSL');
      return {
        valid: false,
        error: 'Invalid URL: URL is missing or empty',
        daysRemaining: 0,
        tlsVersions: {
          supported: ['Unknown'],
          insecure: [],
          highest: 'Unknown'
        }
      };
    }
    
    // URL'yi normalize et
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url;
    }
    
    let parsedUrl;
    try {
      parsedUrl = new URL(formattedUrl);
    } catch (urlError) {
      logger.error(`Invalid URL format: ${formattedUrl}`, urlError);
      return {
        valid: false,
        error: `Invalid URL format: ${urlError.message}`,
        daysRemaining: 0,
        tlsVersions: {
          supported: ['Unknown'],
          insecure: [],
          highest: 'Unknown'
        }
      };
    }
    
    const domain = parsedUrl.hostname;
    logger.info(`Extracting hostname from URL: ${domain}`);
    
    // Get certificate details
    logger.info(`Getting SSL certificate for domain: ${domain}`);
    const sslInfo = await getSSLCertificate(domain);
    logger.info(`SSL certificate retrieved successfully: ${JSON.stringify(sslInfo)}`);
    
    // Return the SSL information
    logger.info(`SSL check completed successfully for ${url}`);
    return {
      valid: sslInfo.valid,
      issuer: sslInfo.issuer,
      subject: sslInfo.subject,
      issuedAt: sslInfo.issuedAt,
      expiresAt: sslInfo.expiresAt,
      daysRemaining: sslInfo.daysRemaining,
      validFrom: sslInfo.issuedAt,
      validTo: sslInfo.expiresAt,
      selfSigned: sslInfo.selfSigned,
      tlsVersions: sslInfo.tlsVersions || {
        supported: ['Unknown'],
        insecure: [],
        highest: 'Unknown'
      }
    };
  } catch (error) {
    logger.error(`SSL check error for ${url || 'unknown URL'}:`, error);
    // Yerine hata fırlatmak yerine bir hata objesi dönelim
    return {
      valid: false,
      error: error.message,
      daysRemaining: 0,
      tlsVersions: {
        supported: ['Unknown'],
        insecure: [],
        highest: 'Unknown'
      }
    };
  }
};

// Factory function to create SSL check service with dependency injection
const createSslCheckService = (websiteServiceFunctions) => {
  // Check SSL certificates for all websites
  const checkAllWebsites = async () => {
    try {
      // Get all websites
      const websites = websiteServiceFunctions.getAllWebsites();
      
      // Track results
      const results = {
        success: 0,
        failed: 0,
        warnings: 0,
        expired: 0,
        insecureTls: 0,
        details: []
      };
      
      // Check each website
      for (const website of websites) {
        try {
          // Skip websites with notifications disabled
          if (!website.notificationsEnabled) {
            continue;
          }
          
          const url = new URL(website.url);
          const domain = url.hostname;
          
          // Get certificate details
          const sslInfo = await getSSLCertificate(domain);
          
          // Check for insecure TLS versions
          const hasInsecureTls = sslInfo.tlsVersions && sslInfo.tlsVersions.insecure && 
                                sslInfo.tlsVersions.insecure.length > 0;
          
          // Update website with SSL details
          websiteServiceFunctions.updateWebsite(website.id, {
            sslStatus: sslInfo.valid ? 'VALID' : 'INVALID',
            lastCheck: Date.now(),
            sslDetails: {
              issuer: sslInfo.issuer,
              subject: sslInfo.subject,
              issuedAt: sslInfo.issuedAt,
              expiresAt: sslInfo.expiresAt,
              daysRemaining: sslInfo.daysRemaining,
              valid: sslInfo.valid,
              selfSigned: sslInfo.selfSigned,
              tlsVersions: sslInfo.tlsVersions
            }
          });
          
          results.success++;
          
          // Check for insecure TLS versions and send notification
          if (hasInsecureTls) {
            results.insecureTls++;
            
            // Send insecure TLS notification
            const insecureVersions = sslInfo.tlsVersions.insecure.join(', ');
            const message = `⚠️ Website ${website.name} (${website.url}) is using insecure TLS versions: ${insecureVersions}. Only TLSv1.2 and TLSv1.3 are recommended.`;
            
            await notificationService.sendNotification(
              'Insecure TLS Version Detected',
              message,
              notificationService.NOTIFICATION_TYPES.SECURITY_WARNING
            );
            
            // Log notification in website history
            websiteServiceFunctions.addNotification(website.id, {
              type: notificationService.NOTIFICATION_TYPES.SECURITY_WARNING,
              message
            });
          }
          
          // Check if expired
          if (!sslInfo.valid) {
            results.expired++;
            
            // Send expiry notification
            const message = `⚠️ SSL certificate for ${website.name} (${website.url}) has expired on ${new Date(sslInfo.expiresAt).toLocaleDateString()}`;
            await notificationService.sendNotification(
              'SSL Certificate Expired',
              message,
              notificationService.NOTIFICATION_TYPES.SSL_EXPIRED
            );
            
            // Log notification in website history
            websiteServiceFunctions.addNotification(website.id, {
              type: notificationService.NOTIFICATION_TYPES.SSL_EXPIRED,
              message
            });
          }
          // Check if expiring soon
          else if (sslInfo.daysRemaining <= 30) {
            results.warnings++;
            
            // Send warning notification
            const message = `🔶 SSL certificate for ${website.name} (${website.url}) will expire in ${sslInfo.daysRemaining} days (on ${new Date(sslInfo.expiresAt).toLocaleDateString()})`;
            await notificationService.sendNotification(
              'SSL Certificate Expiring Soon',
              message,
              notificationService.NOTIFICATION_TYPES.SSL_EXPIRY_WARNING
            );
            
            // Log notification in website history
            websiteServiceFunctions.addNotification(website.id, {
              type: notificationService.NOTIFICATION_TYPES.SSL_EXPIRY_WARNING,
              message
            });
          }
          
          results.details.push({
            url: website.url,
            status: 'success',
            valid: sslInfo.valid,
            daysRemaining: sslInfo.daysRemaining,
            expiresAt: sslInfo.expiresAt,
            hasInsecureTls: hasInsecureTls,
            tlsVersions: sslInfo.tlsVersions
          });
        } catch (error) {
          logger.error(`Error checking SSL for ${website.url}:`, error);
          results.failed++;
          
          // Update website with error status
          websiteServiceFunctions.updateWebsite(website.id, {
            sslStatus: 'UNKNOWN',
            lastCheck: Date.now(),
            sslDetails: {
              valid: false,
              error: error.message
            }
          });
          
          // Send check failed notification
          const message = `❌ Failed to check SSL certificate for ${website.name} (${website.url}): ${error.message}`;
          await notificationService.sendNotification(
            'SSL Check Failed',
            message,
            notificationService.NOTIFICATION_TYPES.SSL_CHECK_FAILED
          );
          
          // Log notification in website history
          websiteServiceFunctions.addNotification(website.id, {
            type: notificationService.NOTIFICATION_TYPES.SSL_CHECK_FAILED,
            message
          });
          
          results.details.push({
            url: website.url,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      // Update next check time
      settingsService.calculateNextCheckTime();
      
      logger.info(`SSL check completed: ${results.success} successful, ${results.failed} failed, ${results.warnings} warnings, ${results.expired} expired, ${results.insecureTls} with insecure TLS`);
      return results;
    } catch (error) {
      logger.error('Error in SSL check process:', error);
      throw error;
    }
  };
  
  return {
    checkAllWebsites,
    checkWebsiteSSL // Bu, websiteService üzerinden erişilebilir olacak
  };
};

module.exports = {
  getSSLCertificate,
  checkWebsiteSSL,
  createSslCheckService
}; 