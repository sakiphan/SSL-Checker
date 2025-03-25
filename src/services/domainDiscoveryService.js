const { execSync } = require('child_process');
const dns = require('dns');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Websites dosyasının yolunu belirtiyoruz
const WEBSITES_FILE = path.join(__dirname, '../data/websites.json');

// Promisify DNS methods
const resolveCname = promisify(dns.resolveCname);
const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);
const resolveNs = promisify(dns.resolveNs);

// Common subdomains to check
const commonSubdomains = [
  'www', 'mail', 'remote', 'blog', 'webmail', 'server', 'ns1', 'ns2', 
  'smtp', 'secure', 'vpn', 'api', 'dev', 'stage', 'test', 'app', 
  'm', 'mobile', 'shop', 'store', 'support', 'admin', 'portal'
];

// Discover subdomains for a given domain
const discoverSubdomains = async (domain) => {
  const mainDomain = extractMainDomain(domain);
  const discoveredDomains = new Set();
  
  try {
    // Add original domain
    discoveredDomains.add(domain);
    
    // Try common subdomains
    for (const subdomain of commonSubdomains) {
      const fullDomain = `${subdomain}.${mainDomain}`;
      try {
        // Check if subdomain resolves
        await promisify(dns.lookup)(fullDomain);
        discoveredDomains.add(fullDomain);
      } catch (error) {
        // Domain doesn't resolve, skip
      }
    }
    
    // Try to find subdomains from certificate (works for domains already using SSL)
    try {
      const certDomains = await getDomainsFromCertificate(domain);
      certDomains.forEach(d => discoveredDomains.add(d));
    } catch (error) {
      logger.info(`Couldn't get domains from certificate for ${domain}: ${error.message}`);
    }
    
    // Try to get subdomains from DNS records
    try {
      const dnsDomains = await getDomainsFromDNS(mainDomain);
      dnsDomains.forEach(d => discoveredDomains.add(d));
    } catch (error) {
      logger.info(`Couldn't get domains from DNS for ${mainDomain}: ${error.message}`);
    }
    
    return Array.from(discoveredDomains);
  } catch (error) {
    logger.error(`Error discovering subdomains for ${domain}:`, error);
    return [domain]; // Return at least the original domain
  }
};

// Extract main domain from a subdomain
const extractMainDomain = (domain) => {
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;
  
  // Handle special cases like co.uk, com.au, etc.
  const specialTLDs = ['co.uk', 'com.au', 'co.nz', 'org.uk', 'co.za'];
  const lastTwo = parts.slice(-2).join('.');
  
  if (specialTLDs.includes(lastTwo)) {
    // Return the last three parts for special TLDs
    return parts.slice(-3).join('.');
  }
  
  // Return the last two parts for regular domains
  return parts.slice(-2).join('.');
};

// Get domains from SSL certificate
const getDomainsFromCertificate = async (domain) => {
  try {
    const result = execSync(
      `echo | openssl s_client -showcerts -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -text | grep -o "DNS:[^,]*" | sed 's/DNS://g'`,
      { encoding: 'utf8' }
    );
    
    return result.split('\n')
      .filter(d => d.trim().length > 0)
      .map(d => d.trim());
  } catch (error) {
    logger.error(`Error getting domains from certificate for ${domain}:`, error);
    return [];
  }
};

// Get subdomains from DNS records
const getDomainsFromDNS = async (domain) => {
  const domains = new Set();
  
  try {
    // Try to get from NS records
    const nsRecords = await resolveNs(domain);
    nsRecords.forEach(record => {
      if (record.includes(domain)) {
        domains.add(record);
      }
    });
  } catch (error) {
    // Ignore errors
  }
  
  try {
    // Try to get from MX records
    const mxRecords = await resolveMx(domain);
    mxRecords.forEach(record => {
      if (record.exchange.includes(domain)) {
        domains.add(record.exchange);
      }
    });
  } catch (error) {
    // Ignore errors
  }
  
  try {
    // Try to get from CNAME records for common subdomains
    for (const subdomain of commonSubdomains) {
      try {
        const cnameRecords = await resolveCname(`${subdomain}.${domain}`);
        cnameRecords.forEach(record => {
          domains.add(`${subdomain}.${domain}`);
          if (record.includes(domain)) {
            domains.add(record);
          }
        });
      } catch (error) {
        // Ignore errors
      }
    }
  } catch (error) {
    // Ignore errors
  }
  
  return Array.from(domains);
};

// Get all websites directly from file, avoiding circular dependency
const getAllWebsites = () => {
  try {
    if (!fs.existsSync(WEBSITES_FILE)) {
      return [];
    }
    
    const websitesData = fs.readFileSync(WEBSITES_FILE, 'utf8');
    return JSON.parse(websitesData);
  } catch (error) {
    logger.error('Error reading websites file directly:', error);
    return [];
  }
};

// Add discovered domains to monitoring
const addDiscoveredDomainsToMonitoring = async (domain, websiteName) => {
  try {
    logger.info(`Starting domain discovery for ${domain}`);
    const discoveredDomains = await discoverSubdomains(domain);
    logger.info(`Discovered ${discoveredDomains.length} domains for ${domain}`);
    
    // Bu noktada websiteService modülünü kullanmadan devam etmek daha güvenli
    // Callback için bir fonksiyon object'i döndürelim
    return {
      total: discoveredDomains.length,
      domains: discoveredDomains.filter(d => d !== domain) // Ana domain hariç
    };
  } catch (error) {
    logger.error(`Error in domain discovery for ${domain}:`, error);
    return {
      total: 0,
      domains: [],
      error: error.message
    };
  }
};

module.exports = {
  discoverSubdomains,
  addDiscoveredDomainsToMonitoring
}; 