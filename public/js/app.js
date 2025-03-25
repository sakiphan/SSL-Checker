// Sayfa yüklendiğinde çalışacak 
document.addEventListener('DOMContentLoaded', async () => {
  // URL'deki sorgu parametrelerini temizle
  if (window.location.search) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // İlk elementi seç (websiteler)
  showWebsitesSection();
  
  // Navigasyon olaylarını dinle
  document.getElementById('nav-websites').addEventListener('click', (e) => {
    e.preventDefault();
    showWebsitesSection();
  });
  
  document.getElementById('nav-settings').addEventListener('click', (e) => {
    e.preventDefault();
    showSettingsSection();
  });
  
  // Website ekleme formu
  document.getElementById('website-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const websiteId = document.getElementById('website-id').value;
    if (websiteId) {
      // Güncelleme işlemi
      updateWebsite();
    } else {
      // Ekleme işlemi
      addWebsite();
    }
  });
  
  // Website ekleme butonu
  document.getElementById('add-website-btn').addEventListener('click', showAddWebsiteModal);
  
  // Form olaylarını dinle
  document.getElementById('notification-settings-form').addEventListener('submit', handleNotificationSettingsSubmit);
  document.getElementById('telegram-settings-form').addEventListener('submit', handleTelegramSettingsSubmit);
  document.getElementById('email-settings-form').addEventListener('submit', handleEmailSettingsSubmit);
  document.getElementById('schedule-settings-form').addEventListener('submit', handleScheduleSettingsSubmit);
  document.getElementById('security-settings-form').addEventListener('submit', handleSecuritySettingsSubmit);
  
  // Test butonları
  document.getElementById('test-telegram-btn').addEventListener('click', testTelegramNotification);
  document.getElementById('test-email-btn').addEventListener('click', testEmailNotification);
  document.getElementById('run-check-now-btn').addEventListener('click', runManualSSLCheck);
  
  // Modları kapat butonlarını dinle
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      closeModals();
    });
  });
  
  // Cancel butonları için de olay ekle
  document.querySelectorAll('.btn.cancel').forEach(cancelBtn => {
    cancelBtn.addEventListener('click', () => {
      closeModals();
    });
  });
  
  // Modal dışı tıklamaları dinle
  window.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // Tarayıcı geri/ileri butonları için popstate olayını dinle
  window.addEventListener('popstate', (e) => {
    // Önceki sayfaya göre bölümü göster
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') {
      showWebsitesSection();
    }
  });
  
  // Websiteleri yükle
  await loadWebsites();
  
  // Ayarları yükle
  loadSettings();
});

// Websiteler sayfasını göster
function showWebsitesSection() {
  document.getElementById('websites-section').style.display = 'block';
  document.getElementById('settings-section').style.display = 'none';
  
  // Navigasyon linklerini güncelle
  document.getElementById('nav-websites').classList.add('active');
  document.getElementById('nav-settings').classList.remove('active');
  
  // Detay bölümünü gizle
  const detailsSection = document.getElementById('website-details-section');
  if (detailsSection) {
    detailsSection.style.display = 'none';
  }
}

// Ayarlar sayfasını göster
function showSettingsSection() {
  // URL'in değişmesini önle - history.pushState kullanımı
  if (window.location.search) {
    window.history.pushState({}, document.title, window.location.pathname);
  }
  
  document.getElementById('websites-section').style.display = 'none';
  document.getElementById('settings-section').style.display = 'block';
  
  // Navigasyon linklerini güncelle
  document.getElementById('nav-websites').classList.remove('active');
  document.getElementById('nav-settings').classList.add('active');
  
  // Detay bölümünü gizle
  const detailsSection = document.getElementById('website-details-section');
  if (detailsSection) {
    detailsSection.style.display = 'none';
  }
}

// Navigasyon işlevselliği
function setupNavigation() {
  const navLinks = document.querySelectorAll('nav a');
  const websitesSection = document.getElementById('websites-section');
  const settingsSection = document.getElementById('settings-section');
  
  // Navigasyon linklerine tıklama işlevi
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Aktif sınıfını kaldır
      navLinks.forEach(l => l.classList.remove('active'));
      
      // Tıklanan link'e aktif sınıfını ekle
      this.classList.add('active');
      
      // İlgili bölümü göster
      if (this.id === 'nav-websites') {
        websitesSection.style.display = 'block';
        settingsSection.style.display = 'none';
      } else if (this.id === 'nav-settings') {
        websitesSection.style.display = 'none';
        settingsSection.style.display = 'block';
      }
    });
  });
}

// Website listesini yükleme
async function loadWebsites() {
  const tableBody = document.getElementById('websites-table-body');
  const loadingEl = document.querySelector('.websites-list .loading');
  
  try {
    loadingEl.style.display = 'block';
    
    const response = await axios.get('/api/websites');
    const websites = response.data.websites;
    
    loadingEl.style.display = 'none';
    
    if (websites.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center;">Hiç website bulunamadı. İzlemek için ilk websitenizi ekleyin.</td>
        </tr>
      `;
      return;
    }
    
    let html = '';
    
    websites.forEach(website => {
      // Yeni modele göre SSL bilgilerini al
      let expiryDate = null;
      let daysRemaining = '';
      let statusClass = '';
      const lastChecked = website.lastCheck ? new Date(website.lastCheck) : null;
      
      // sslDetails nesnesini kontrol et
      if (website.sslDetails && website.sslDetails.expiresAt) {
        expiryDate = new Date(website.sslDetails.expiresAt);
        
        // website.sslDetails.daysRemaining varsa kullan, yoksa hesapla
        if (website.sslDetails.daysRemaining !== undefined) {
          daysRemaining = website.sslDetails.daysRemaining.toString();
        } else {
          const today = new Date();
          const diffTime = expiryDate - today;
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
        }
        
        // Renk sınıfını belirle
        if (website.sslStatusColor) {
          statusClass = getStatusClassFromColor(website.sslStatusColor);
        } else {
          if (parseInt(daysRemaining) <= 7) {
            statusClass = 'danger';
          } else if (parseInt(daysRemaining) <= 15) {
            statusClass = 'warning';
          } else {
            statusClass = 'success';
          }
        }
      } else if (website.sslExpiryDate) {
        // Eski modele göre destek (geriye uyumluluk için)
        expiryDate = new Date(website.sslExpiryDate);
        
        const today = new Date();
        const diffTime = expiryDate - today;
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
        
        if (parseInt(daysRemaining) <= 7) {
          statusClass = 'danger';
        } else if (parseInt(daysRemaining) <= 15) {
          statusClass = 'warning';
        } else {
          statusClass = 'success';
        }
      }
      
      // SSL durumunu göster
      const sslStatus = website.sslStatus || (website.sslDetails && website.sslDetails.valid ? 'VALID' : website.sslDetails && website.sslDetails.valid === false ? 'EXPIRED' : 'UNKNOWN');
      let statusBadge = '';
      
      switch (sslStatus) {
        case 'VALID':
          statusBadge = '<span class="badge success">Valid</span>';
          break;
        case 'WARNING':
          statusBadge = '<span class="badge warning">Warning</span>';
          break;
        case 'EXPIRED':
          statusBadge = '<span class="badge danger">Expired</span>';
          break;
        default:
          statusBadge = '<span class="badge">Unknown</span>';
      }
      
      // Güvenlik derecelendirmesi göster
      let securityBadge = '-';
      if (website.sslGrade) {
        const gradeColor = getGradeColor(website.sslGrade);
        securityBadge = `<span class="badge" style="background-color: ${gradeColor};">${website.sslGrade}</span>`;
      }
      
      html += `
        <tr data-id="${website.id}">
          <td>${website.name}</td>
          <td><a href="${website.url}" target="_blank">${website.url}</a></td>
          <td>${expiryDate ? expiryDate.toLocaleDateString() : '-'}</td>
          <td>${daysRemaining ? `<span class="badge ${statusClass}">${daysRemaining} days</span>` : '-'}</td>
          <td>${lastChecked ? lastChecked.toLocaleDateString() + ' ' + lastChecked.toLocaleTimeString() : '-'}</td>
          <td>${statusBadge}</td>
          <td style="display: none;">${securityBadge}</td>
          <td>
            <button class="btn check-ssl" title="Check SSL" data-id="${website.id}">🔍</button>
            <button class="btn view-details" title="View Details" data-id="${website.id}">📋</button>
            <button class="btn edit-website" title="Edit" data-id="${website.id}">✏️</button>
            <button class="btn danger delete-website" title="Delete" data-id="${website.id}">🗑️</button>
          </td>
        </tr>
      `;
    });
    
    tableBody.innerHTML = html;
    
    // Buton işlevlerini ekle
    setupWebsiteTableButtons();
    
  } catch (error) {
    loadingEl.style.display = 'none';
    console.error('Error loading websites:', error);
    alert('An error occurred while loading websites. Please refresh the page.');
  }
}

// SSL güvenlik derecesi için renk kodu döndürür
function getGradeColor(grade) {
  switch (grade) {
    case 'A+':
      return '#4CAF50'; // Green
    case 'A':
      return '#8BC34A'; // Light Green
    case 'B':
      return '#CDDC39'; // Lime
    case 'C':
      return '#FFC107'; // Amber
    case 'D':
      return '#FF9800'; // Orange
    case 'F':
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Gray
  }
}

// HEX renk kodundan CSS sınıfını belirler
function getStatusClassFromColor(hexColor) {
  if (!hexColor) return '';
  
  // Renk kodlarına göre sınıf belirle
  if (hexColor === '#4CAF50') return 'success';
  if (hexColor === '#FFC107') return 'warning'; 
  if (hexColor === '#F44336') return 'danger';
  
  return '';
}

// Website tablosundaki butonların işlevselliği
function setupWebsiteTableButtons() {
  // SSL kontrol butonları
  document.querySelectorAll('.check-ssl').forEach(button => {
    button.addEventListener('click', async function() {
      const websiteId = this.getAttribute('data-id');
      
      try {
        const row = this.closest('tr');
        row.classList.add('checking');
        this.textContent = '⏳';
        
        const response = await axios.get(`/api/websites/${websiteId}/check-ssl`);
        
        // Sayfayı yenile
        loadWebsites();
        
      } catch (error) {
        console.error('Error during SSL check:', error);
        alert('An error occurred during SSL check.');
        this.textContent = '🔍';
        row.classList.remove('checking');
      }
    });
  });
  
  // Detay butonları
  document.querySelectorAll('.view-details').forEach(button => {
    button.addEventListener('click', async function() {
      const websiteId = this.getAttribute('data-id');
      
      try {
        const response = await axios.get(`/api/websites/${websiteId}`);
        const website = response.data.website;
        
        showWebsiteDetails(website);
        
      } catch (error) {
        console.error('Error getting website details:', error);
        alert('An error occurred while getting website details.');
      }
    });
  });
  
  // Düzenleme butonları
  document.querySelectorAll('.edit-website').forEach(button => {
    button.addEventListener('click', async function() {
      const websiteId = this.getAttribute('data-id');
      
      try {
        const response = await axios.get(`/api/websites/${websiteId}`);
        const website = response.data.website;
        
        // Modal'ı düzenleme modunda aç
        openWebsiteModal('edit', website);
        
      } catch (error) {
        console.error('Error getting website information:', error);
        alert('An error occurred while getting website information.');
      }
    });
  });
  
  // Silme butonları
  document.querySelectorAll('.delete-website').forEach(button => {
    button.addEventListener('click', async function() {
      const websiteId = this.getAttribute('data-id');
      const row = this.closest('tr');
      const websiteName = row.querySelector('td').textContent;
      
      if (confirm(`Are you sure you want to delete "${websiteName}"?`)) {
        try {
          await axios.delete(`/api/websites/${websiteId}`);
          
          // Sayfayı yenile
          loadWebsites();
          
        } catch (error) {
          console.error('Error deleting website:', error);
          alert('An error occurred while deleting the website.');
        }
      }
    });
  });
}

// Website detaylarını göster
function showWebsiteDetails(website) {
  // Önce detay kısmını oluşturalım
  const websiteSection = document.getElementById('websites-section');
  const existingDetails = document.getElementById('website-details-section');
  
  if (existingDetails) {
    existingDetails.remove();
  }
  
  const detailsSection = document.createElement('div');
  detailsSection.id = 'website-details-section';
  detailsSection.className = 'card';
  
  let tlsVersionsHtml = '<p>TLS Version information not available</p>';
  
  if (website.sslDetails && website.sslDetails.tlsVersions) {
    const tlsVersions = website.sslDetails.tlsVersions;
    const supported = tlsVersions.supported || [];
    const insecure = tlsVersions.insecure || [];
    const highest = tlsVersions.highest || 'Unknown';
    
    tlsVersionsHtml = `
      <div class="tls-info">
        <h4>TLS Version Information</h4>
        <p><strong>Highest Supported:</strong> <span class="${highest.includes('TLSv1.2') || highest.includes('TLSv1.3') ? 'badge success' : 'badge danger'}">${highest}</span></p>
        <p><strong>Supported Versions:</strong> ${supported.map(v => `<span class="${insecure.includes(v) ? 'badge danger' : 'badge success'}">${v}</span>`).join(' ')}</p>
        ${insecure.length > 0 ? `<p class="warning"><strong>Warning:</strong> Insecure TLS versions detected: ${insecure.join(', ')}</p>` : ''}
      </div>
    `;
  }
  
  // SSL sertifika detayları
  let certDetails = '<p>SSL certificate details not available</p>';
  
  if (website.sslDetails) {
    const ssl = website.sslDetails;
    certDetails = `
      <div class="cert-details">
        <table class="details-table">
          <tr>
            <th>Valid</th>
            <td><span class="badge ${ssl.valid ? 'success' : 'danger'}">${ssl.valid ? 'Yes' : 'No'}</span></td>
          </tr>
          <tr>
            <th>Issued By</th>
            <td>${ssl.issuer || 'Unknown'}</td>
          </tr>
          <tr>
            <th>Issued To</th>
            <td>${ssl.subject || 'Unknown'}</td>
          </tr>
          <tr>
            <th>Issued At</th>
            <td>${ssl.issuedAt ? new Date(ssl.issuedAt).toLocaleDateString() : 'Unknown'}</td>
          </tr>
          <tr>
            <th>Expires At</th>
            <td>${ssl.expiresAt ? new Date(ssl.expiresAt).toLocaleDateString() : 'Unknown'}</td>
          </tr>
          <tr>
            <th>Days Remaining</th>
            <td>
              <span class="badge ${ssl.daysRemaining > 30 ? 'success' : ssl.daysRemaining > 7 ? 'warning' : 'danger'}">
                ${ssl.daysRemaining || 'Unknown'} days
              </span>
            </td>
          </tr>
          <tr>
            <th>Self-Signed</th>
            <td>${ssl.selfSigned ? 'Yes' : 'No'}</td>
          </tr>
        </table>
      </div>
    `;
  }
  
  // Güvenlik puanı
  let securityRating = '';
  if (website.sslGrade) {
    const gradeColor = getGradeColor(website.sslGrade);
    securityRating = `
      <div class="security-rating">
        <h4>Security Rating</h4>
        <div class="grade-badge" style="background-color: ${gradeColor}; color: white; font-size: 24px; padding: 10px; border-radius: 5px; display: inline-block; margin-bottom: 10px;">
          ${website.sslGrade}
        </div>
        <p>Score: ${website.securityScore || 'N/A'}/100</p>
      </div>
    `;
  }
  
  // Alt alan detayları
  let subdomainsHtml = '';
  if (website.isSubdomain) {
    subdomainsHtml = `
      <div class="subdomain-info">
        <h4>Subdomain Information</h4>
        <p><strong>Parent Domain:</strong> ${website.parentDomain || 'Unknown'}</p>
      </div>
    `;
  }
  
  detailsSection.innerHTML = `
    <div class="details-header">
      <h3>${website.name}</h3>
      <button id="back-to-websites" class="btn secondary">← Back to Websites</button>
    </div>
    
    <div class="website-details">
      <div class="url-section">
        <p><strong>URL:</strong> <a href="${website.url}" target="_blank">${website.url}</a></p>
        <p><strong>Added:</strong> ${new Date(website.addedAt).toLocaleDateString()}</p>
        <p><strong>Last Checked:</strong> ${website.lastCheck ? new Date(website.lastCheck).toLocaleDateString() + ' ' + new Date(website.lastCheck).toLocaleTimeString() : 'Never'}</p>
        <p><strong>Description:</strong> ${website.description || 'No description'}</p>
        <p><strong>Tags:</strong> ${website.tags && website.tags.length > 0 ? website.tags.join(', ') : 'No tags'}</p>
      </div>
      
      <div class="details-grid">
        <div class="grid-item">
          <h4>SSL Certificate Details</h4>
          ${certDetails}
        </div>
        
        <div class="grid-item">
          ${tlsVersionsHtml}
          ${securityRating}
          ${subdomainsHtml}
        </div>
      </div>
      
      <div class="notification-history">
        <h4>Notification History</h4>
        ${website.notifications && website.notifications.length > 0 
          ? `<ul class="notifications-list">
              ${website.notifications.map(n => `
                <li class="notification-item">
                  <div class="notification-time">${new Date(n.timestamp).toLocaleDateString()} ${new Date(n.timestamp).toLocaleTimeString()}</div>
                  <div class="notification-type">${n.type.replace(/_/g, ' ').toUpperCase()}</div>
                  <div class="notification-message">${n.message}</div>
                </li>
              `).join('')}
            </ul>`
          : '<p>No notifications recorded</p>'
        }
      </div>
    </div>
  `;
  
  // Detay bölümünü ekle
  websiteSection.after(detailsSection);
  
  // Geri dönüş butonu işlevi
  document.getElementById('back-to-websites').addEventListener('click', function() {
    detailsSection.remove();
    websiteSection.style.display = 'block';
  });
  
  // Websiteler bölümünü gizle
  websiteSection.style.display = 'none';
  
  // Stil eklemeleri
  const style = document.createElement('style');
  style.textContent = `
    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-gap: 20px;
      margin-top: 20px;
    }
    .grid-item {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 5px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
    }
    .details-table th, .details-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .warning {
      color: #e74c3c;
      font-weight: bold;
    }
    .notifications-list {
      list-style: none;
      padding: 0;
    }
    .notification-item {
      padding: 10px;
      margin-bottom: 10px;
      border-left: 4px solid #3498db;
      background: #f8f9fa;
    }
    .notification-time {
      font-size: 12px;
      color: #7f8c8d;
    }
    .notification-type {
      font-weight: bold;
      margin: 5px 0;
    }
    @media (max-width: 768px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

// Ayarları yükle
async function loadSettings() {
  try {
    showLoading('Loading settings...');
    const response = await axios.get('/api/settings');
    
    if (response.data.success) {
      const settings = response.data.settings;
      
      // Notification channel
      const notificationChannel = settings.notificationChannel || 'telegram';
      document.querySelector(`input[name="notificationChannel"][value="${notificationChannel}"]`).checked = true;
      
      // Telegram settings
      document.getElementById('telegram-enabled').checked = settings.telegramEnabled || false;
      document.getElementById('telegram-token').value = settings.telegramBotToken || '';
      document.getElementById('telegram-chat-id').value = settings.telegramChatId || '';
      
      // Email settings
      document.getElementById('email-enabled').checked = settings.emailEnabled || false;
      document.getElementById('email-host').value = settings.emailHost || '';
      document.getElementById('email-port').value = settings.emailPort || 587;
      document.getElementById('email-secure').checked = settings.emailSecure || false;
      document.getElementById('email-user').value = settings.emailUser || '';
      document.getElementById('email-password').value = settings.emailPassword || '';
      document.getElementById('email-from').value = settings.emailFrom || '';
      document.getElementById('email-to').value = settings.emailTo || '';
      
      // Schedule settings
      document.getElementById('check-frequency').value = settings.checkFrequency || 24;
      document.getElementById('warning-days').value = settings.warningDays || 30;
      
      // Security settings
      document.getElementById('enable-security-check').checked = settings.enableSecurityCheck || false;
      
      // Times
      if (settings.lastCheckTimestamp) {
        const lastCheck = new Date(settings.lastCheckTimestamp);
        document.getElementById('last-check-time').textContent = 
          `${lastCheck.toLocaleDateString()} ${lastCheck.toLocaleTimeString()}`;
      } else {
        document.getElementById('last-check-time').textContent = 'Never';
      }
      
      if (settings.nextCheckTimestamp) {
        const nextCheck = new Date(settings.nextCheckTimestamp);
        document.getElementById('next-check-time').textContent = 
          `${nextCheck.toLocaleDateString()} ${nextCheck.toLocaleTimeString()}`;
      } else {
        document.getElementById('next-check-time').textContent = 'Not scheduled';
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showError('Failed to load settings');
  } finally {
    hideLoading();
  }
}

// Website modal işlevselliği
function setupWebsiteModal() {
  const modal = document.getElementById('website-modal');
  const closeButtons = modal.querySelectorAll('.close, .btn.cancel');
  const addWebsiteBtn = document.getElementById('add-website-btn');
  
  // Yeni website ekleme butonu
  addWebsiteBtn.addEventListener('click', function() {
    openWebsiteModal('add');
  });
  
  // Modal kapatma butonları
  closeButtons.forEach(button => {
    button.addEventListener('click', function() {
      closeWebsiteModal();
    });
  });
  
  // Modal dışına tıklandığında kapat
  window.addEventListener('click', function(event) {
    if (event.target == modal) {
      closeWebsiteModal();
    }
  });
}

// Website modal penceresini aç
function openWebsiteModal(mode, website = null) {
  const modal = document.getElementById('website-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('website-form');
  const websiteIdInput = document.getElementById('website-id');
  const websiteNameInput = document.getElementById('website-name');
  const websiteUrlInput = document.getElementById('website-url');
  const websiteDescriptionInput = document.getElementById('website-description');
  const websiteTagsInput = document.getElementById('website-tags');
  const notificationsEnabledInput = document.getElementById('notifications-enabled');
  
  // Modal başlığını ayarla
  if (mode === 'add') {
    modalTitle.textContent = 'Add New Website';
  } else {
    modalTitle.textContent = 'Edit Website';
  }
  
  // Form değerlerini ayarla
  if (website) {
    websiteIdInput.value = website.id;
    websiteNameInput.value = website.name;
    websiteUrlInput.value = website.url;
    websiteDescriptionInput.value = website.description || '';
    websiteTagsInput.value = website.tags ? website.tags.join(',') : '';
    notificationsEnabledInput.checked = website.notificationsEnabled;
    
    // Düzenleme modunda URL'yi devre dışı bırak
    websiteUrlInput.disabled = true;
  } else {
    // Ekleme modunda formu sıfırla
    form.reset();
    websiteIdInput.value = '';
    websiteUrlInput.disabled = false;
  }
  
  // Modal'ı göster
  modal.style.display = 'block';
}

// Website modal penceresini kapat
function closeWebsiteModal() {
  const modal = document.getElementById('website-modal');
  modal.style.display = 'none';
}

// Form gönderim işlemleri
function setupFormHandlers() {
  // Website form gönderimi
  const websiteForm = document.getElementById('website-form');
  websiteForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const websiteId = document.getElementById('website-id').value;
    const websiteName = document.getElementById('website-name').value;
    const websiteUrl = document.getElementById('website-url').value;
    const websiteDescription = document.getElementById('website-description').value;
    const websiteTags = document.getElementById('website-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    const notificationsEnabled = document.getElementById('notifications-enabled').checked;
    
    const websiteData = {
      name: websiteName,
      url: websiteUrl,
      description: websiteDescription,
      tags: websiteTags,
      notificationsEnabled: notificationsEnabled
    };
    
    try {
      if (websiteId) {
        // Güncelleme işlemi
        await axios.put(`/api/websites/${websiteId}`, websiteData);
      } else {
        // Ekleme işlemi
        await axios.post('/api/websites', websiteData);
      }
      
      // Modal'ı kapat ve listeyi yenile
      closeWebsiteModal();
      loadWebsites();
      
    } catch (error) {
      console.error('Error saving website:', error);
      alert(error.response?.data?.error || 'An error occurred while saving the website.');
    }
  });
  
  // Bildirim tercihleri form gönderimi
  const notificationSettingsForm = document.getElementById('notification-settings-form');
  notificationSettingsForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const notificationChannel = document.querySelector('input[name="notificationChannel"]:checked').value;
    
    try {
      await axios.post('/api/settings/notifications', { notificationChannel });
      alert('Notification preferences saved successfully.');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      alert('An error occurred while saving notification preferences.');
    }
  });
  
  // Telegram ayarları form gönderimi
  const telegramForm = document.getElementById('telegram-settings-form');
  telegramForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const telegramEnabled = document.getElementById('telegram-enabled').checked;
    const telegramBotToken = document.getElementById('telegram-token').value;
    const telegramChatId = document.getElementById('telegram-chat-id').value;
    
    try {
      await axios.post('/api/settings/telegram', { 
        telegramEnabled,
        telegramBotToken,
        telegramChatId
      });
      alert('Telegram settings saved successfully.');
    } catch (error) {
      console.error('Error saving Telegram settings:', error);
      alert('An error occurred while saving Telegram settings.');
    }
  });
  
  // E-posta ayarları form gönderimi
  const emailForm = document.getElementById('email-settings-form');
  emailForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const emailEnabled = document.getElementById('email-enabled').checked;
    const emailHost = document.getElementById('email-host').value;
    const emailPort = document.getElementById('email-port').value;
    const emailSecure = document.getElementById('email-secure').checked;
    const emailUser = document.getElementById('email-user').value;
    const emailPassword = document.getElementById('email-password').value;
    const emailFrom = document.getElementById('email-from').value;
    const emailTo = document.getElementById('email-to').value;
    
    try {
      await axios.post('/api/settings/email', { 
        emailEnabled,
        emailHost,
        emailPort,
        emailSecure,
        emailUser,
        emailPassword,
        emailFrom,
        emailTo
      });
      alert('Email settings saved successfully.');
    } catch (error) {
      console.error('Error saving Email settings:', error);
      alert('An error occurred while saving Email settings.');
    }
  });
  
  // Telegram test butonu
  const testTelegramBtn = document.getElementById('test-telegram-btn');
  testTelegramBtn.addEventListener('click', async function() {
    try {
      const response = await axios.post('/api/settings/telegram/test');
      
      if (response.data.success) {
        alert('Test message sent successfully!');
      } else {
        alert(`Test failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during Telegram test:', error);
      alert('An error occurred during Telegram test.');
    }
  });
  
  // E-posta test butonu
  const testEmailBtn = document.getElementById('test-email-btn');
  testEmailBtn.addEventListener('click', async function() {
    try {
      const response = await axios.post('/api/settings/email/test');
      
      if (response.data.success) {
        alert('Test email sent successfully!');
      } else {
        alert(`Test failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during Email test:', error);
      alert('An error occurred during Email test.');
    }
  });
  
  // Zamanlama ayarları form gönderimi
  const scheduleForm = document.getElementById('schedule-settings-form');
  scheduleForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const checkFrequency = document.getElementById('check-frequency').value;
    const warningDays = document.getElementById('warning-days').value;
    
    try {
      await axios.post('/api/settings/schedule', { 
        checkFrequency,
        warningDays
      });
      
      alert('Schedule settings saved successfully.');
      
      // Zamanlama bilgisini yenile
      const scheduleResponse = await axios.get('/api/settings/schedule');
      const scheduleInfo = scheduleResponse.data.scheduleInfo;
      
      if (scheduleInfo.nextCheck) {
        const nextCheck = new Date(scheduleInfo.nextCheck);
        document.getElementById('next-check-time').textContent = 
          nextCheck.toLocaleDateString() + ' ' + nextCheck.toLocaleTimeString();
      }
    } catch (error) {
      console.error('Error saving schedule settings:', error);
      alert('An error occurred while saving schedule settings.');
    }
  });
  
  // Gelişmiş ayarlar form gönderimi
  const advancedForm = document.getElementById('advanced-settings-form');
  advancedForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const enableAutoDiscovery = document.getElementById('enable-auto-discovery').checked;
    const enableSecurityCheck = document.getElementById('enable-security-check').checked;
    
    try {
      await axios.post('/api/settings/advanced', { 
        enableAutoDiscovery,
        enableSecurityCheck
      });
      
      alert('Advanced settings saved successfully.');
    } catch (error) {
      console.error('Error saving advanced settings:', error);
      alert('An error occurred while saving advanced settings.');
    }
  });
  
  // Manuel kontrol butonu
  const runCheckNowBtn = document.getElementById('run-check-now-btn');
  runCheckNowBtn.addEventListener('click', async function() {
    try {
      this.textContent = 'Checking...';
      this.disabled = true;
      
      const response = await axios.post('/api/settings/check-ssl');
      
      if (response.data.success) {
        alert('SSL check has been started. This may take a few minutes.');
        
        // Birkaç saniye bekleyip websiteleri yenile
        setTimeout(() => {
          loadWebsites();
          loadSettings(); // Zamanlama bilgisini de güncelle
        }, 3000);
      } else {
        alert('An error occurred during SSL check.');
      }
    } catch (error) {
      console.error('Error during manual SSL check:', error);
      alert('An error occurred during manual SSL check.');
    } finally {
      this.textContent = 'Check Now';
      this.disabled = false;
    }
  });
}

// Websiteler tablosunu oluştur
function renderWebsitesTable(websites) {
  const tableBody = document.getElementById('websites-table-body');
  tableBody.innerHTML = '';
  
  if (websites.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="7" style="text-align: center;">Hiç website bulunamadı. İzlemek için ilk websitenizi ekleyin.</td>
    `;
    tableBody.appendChild(row);
    return;
  }
  
  websites.forEach(website => {
    const row = document.createElement('tr');
    
    // SSL Durumu için stil sınıfı belirle
    let statusClass = '';
    switch (website.sslStatus) {
      case 'VALID':
        statusClass = 'status-valid';
        break;
      case 'WARNING':
        statusClass = 'status-warning';
        break;
      case 'EXPIRED':
        statusClass = 'status-expired';
        break;
      default:
        statusClass = 'status-unknown';
    }
    
    // Güvenlik derecesi için stil sınıfı belirle
    let gradeClass = '';
    let gradeDisplay = website.sslGrade || 'N/A';
    
    if (website.sslGrade) {
      switch (website.sslGrade) {
        case 'A+':
          gradeClass = 'grade-a-plus';
          break;
        case 'A':
          gradeClass = 'grade-a';
          break;
        case 'B':
          gradeClass = 'grade-b';
          break;
        case 'C':
          gradeClass = 'grade-c';
          break;
        case 'D':
          gradeClass = 'grade-d';
          break;
        case 'F':
          gradeClass = 'grade-f';
          break;
      }
    }
    
    // Kalan gün sayısı veya sertifika bilgisi
    let daysLeft = 'N/A';
    if (website.sslDetails && website.sslDetails.daysRemaining !== undefined) {
      daysLeft = website.sslDetails.daysRemaining;
    }
    
    // Son kontrol zamanı
    let lastCheck = 'Never';
    if (website.lastCheck) {
      const date = new Date(website.lastCheck);
      lastCheck = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    // Sertifika bitiş tarihi
    let expiryDate = 'N/A';
    if (website.sslDetails && website.sslDetails.validTo) {
      expiryDate = new Date(website.sslDetails.validTo).toLocaleDateString();
    }
    
    row.innerHTML = `
      <td>${website.name}</td>
      <td>
        <a href="${website.url}" target="_blank" rel="noopener noreferrer">
          ${website.url}
        </a>
      </td>
      <td>${expiryDate}</td>
      <td>${daysLeft}</td>
      <td>${lastCheck}</td>
      <td>
        <span class="status-pill ${statusClass}">
          ${website.sslStatus}
        </span>
      </td>
      <td>
        <div class="security-grade ${gradeClass}" title="Security Score: ${website.securityScore || 'N/A'}">
          ${gradeDisplay}
        </div>
      </td>
      <td>
        <button class="btn primary check-ssl-btn" data-id="${website.id}" title="Check SSL">
          <i class="fas fa-sync-alt"></i>
        </button>
        <button class="btn secondary view-details-btn" data-id="${website.id}" title="View Details">
          <i class="fas fa-info-circle"></i>
        </button>
        <button class="btn danger delete-website-btn" data-id="${website.id}" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    // Butonlar için olay dinleyicileri ekle
    const checkSslBtn = row.querySelector('.check-ssl-btn');
    const viewDetailsBtn = row.querySelector('.view-details-btn');
    const deleteWebsiteBtn = row.querySelector('.delete-website-btn');
    
    checkSslBtn.addEventListener('click', () => checkSSL(website.id));
    viewDetailsBtn.addEventListener('click', () => showWebsiteDetails(website));
    deleteWebsiteBtn.addEventListener('click', () => confirmDeleteWebsite(website));
    
    tableBody.appendChild(row);
  });
}

// Güvenlik ayarlarını kaydetme işleyicisi
async function handleSecuritySettingsSubmit(e) {
  e.preventDefault();
  
  try {
    showLoading('Güvenlik ayarları kaydediliyor...');
    
    const enableSecurityCheck = document.getElementById('enable-security-check').checked;
    
    const response = await axios.post('/api/settings/security', {
      enableSecurityCheck
    });
    
    if (response.data.success) {
      showMessage('Güvenlik ayarları başarıyla kaydedildi');
    } else {
      showError(response.data.message || 'Güvenlik ayarları kaydedilemedi');
    }
  } catch (error) {
    console.error('Güvenlik ayarları kaydedilirken hata oluştu:', error);
    showError(error.response?.data?.message || 'Güvenlik ayarları kaydedilirken hata oluştu');
  } finally {
    hideLoading();
  }
}

// Tüm modalları kapat
function closeModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

// Website ekleme modalını göster
function showAddWebsiteModal() {
  const modal = document.getElementById('website-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('website-form');
  
  // Modal başlığını ve formu hazırla
  modalTitle.textContent = 'Add New Website';
  form.reset();
  document.getElementById('website-id').value = '';
  document.getElementById('website-url').disabled = false;
  
  // Modalı göster
  modal.style.display = 'block';
}

// Telegram test mesajı gönder
async function testTelegramNotification() {
  try {
    showLoading('Testing Telegram notification...');
    const response = await axios.post('/api/settings/telegram/test');
    
    if (response.data.success) {
      showMessage('Telegram test message sent successfully!');
    } else {
      showError(response.data.message || 'Failed to send Telegram test message');
    }
  } catch (error) {
    console.error('Error testing Telegram notification:', error);
    showError(error.response?.data?.message || 'Error testing Telegram notification');
  } finally {
    hideLoading();
  }
}

// Email test mesajı gönder
async function testEmailNotification() {
  try {
    showLoading('Testing Email notification...');
    const response = await axios.post('/api/settings/email/test');
    
    if (response.data.success) {
      showMessage('Email test message sent successfully!');
    } else {
      showError(response.data.message || 'Failed to send Email test message');
    }
  } catch (error) {
    console.error('Error testing Email notification:', error);
    showError(error.response?.data?.message || 'Error testing Email notification');
  } finally {
    hideLoading();
  }
}

// Manuel SSL kontrolü başlat
async function runManualSSLCheck() {
  try {
    showLoading('Running SSL check...');
    const response = await axios.post('/api/settings/check-ssl');
    
    if (response.data.success) {
      showMessage('SSL check started in background');
      
      // Birkaç saniye bekledikten sonra websiteleri yenile
      setTimeout(() => {
        loadWebsites();
      }, 3000);
    } else {
      showError(response.data.message || 'Failed to start SSL check');
    }
  } catch (error) {
    console.error('Error running SSL check:', error);
    showError(error.response?.data?.message || 'Error running SSL check');
  } finally {
    hideLoading();
  }
}

// Bildirim ayarlarını güncelle
async function handleNotificationSettingsSubmit(e) {
  e.preventDefault();
  
  try {
    showLoading('Bildirim ayarları kaydediliyor...');
    
    const notificationChannel = document.querySelector('input[name="notificationChannel"]:checked')?.value || 'telegram';
    
    const response = await axios.post('/api/settings/notifications', {
      notificationChannel
    });
    
    if (response.data.success) {
      showMessage('Bildirim ayarları başarıyla kaydedildi');
    } else {
      showError(response.data.message || 'Bildirim ayarları kaydedilemedi');
    }
  } catch (error) {
    console.error('Bildirim ayarları kaydedilirken hata oluştu:', error);
    showError(error.response?.data?.message || 'Bildirim ayarları kaydedilirken hata oluştu');
  } finally {
    hideLoading();
  }
}

// Telegram ayarlarını güncelle
async function handleTelegramSettingsSubmit(e) {
  e.preventDefault();
  
  try {
    showLoading('Saving Telegram settings...');
    
    const telegramEnabled = document.getElementById('telegram-enabled').checked;
    const telegramBotToken = document.getElementById('telegram-token').value;
    const telegramChatId = document.getElementById('telegram-chat-id').value;
    
    const response = await axios.post('/api/settings/telegram', {
      telegramEnabled,
      telegramBotToken,
      telegramChatId
    });
    
    if (response.data.success) {
      showMessage('Telegram settings saved successfully');
    } else {
      showError(response.data.message || 'Failed to save Telegram settings');
    }
  } catch (error) {
    console.error('Error saving Telegram settings:', error);
    showError(error.response?.data?.message || 'Error saving Telegram settings');
  } finally {
    hideLoading();
  }
}

// Email ayarlarını güncelle
async function handleEmailSettingsSubmit(e) {
  e.preventDefault();
  
  try {
    showLoading('Saving Email settings...');
    
    const emailEnabled = document.getElementById('email-enabled').checked;
    const emailHost = document.getElementById('email-host').value;
    const emailPort = parseInt(document.getElementById('email-port').value) || 587;
    const emailSecure = document.getElementById('email-secure').checked;
    const emailUser = document.getElementById('email-user').value;
    const emailPassword = document.getElementById('email-password').value;
    const emailFrom = document.getElementById('email-from').value;
    const emailTo = document.getElementById('email-to').value;
    
    const response = await axios.post('/api/settings/email', {
      emailEnabled,
      emailHost,
      emailPort,
      emailSecure,
      emailUser,
      emailPassword,
      emailFrom,
      emailTo
    });
    
    if (response.data.success) {
      showMessage('Email settings saved successfully');
    } else {
      showError(response.data.message || 'Failed to save Email settings');
    }
  } catch (error) {
    console.error('Error saving Email settings:', error);
    showError(error.response?.data?.message || 'Error saving Email settings');
  } finally {
    hideLoading();
  }
}

// Zamanlama ayarlarını güncelle
async function handleScheduleSettingsSubmit(e) {
  e.preventDefault();
  
  try {
    showLoading('Saving Schedule settings...');
    
    const checkFrequency = parseInt(document.getElementById('check-frequency').value) || 24;
    const warningDays = parseInt(document.getElementById('warning-days').value) || 30;
    
    const response = await axios.post('/api/settings/schedule', {
      checkFrequency,
      warningDays
    });
    
    if (response.data.success) {
      showMessage('Schedule settings saved successfully');
    } else {
      showError(response.data.message || 'Failed to save Schedule settings');
    }
  } catch (error) {
    console.error('Error saving Schedule settings:', error);
    showError(error.response?.data?.message || 'Error saving Schedule settings');
  } finally {
    hideLoading();
  }
}

// Website ekle
async function addWebsite() {
  try {
    const websiteForm = document.getElementById('website-form');
    const formData = new FormData(websiteForm);
    
    const websiteData = {
      name: formData.get('name'),
      url: formData.get('url'),
      description: formData.get('description') || '',
      tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : [],
      notificationsEnabled: formData.get('notificationsEnabled') === 'on'
    };
    
    showLoading('Adding website...');
    
    const response = await axios.post('/api/websites', websiteData);
    
    if (response.data.success) {
      closeModals();
      loadWebsites();
      showMessage('Website added successfully');
    } else {
      showError(response.data.message || 'Failed to add website');
    }
  } catch (error) {
    console.error('Error adding website:', error);
    showError(error.response?.data?.message || 'Error adding website');
  } finally {
    hideLoading();
  }
}

// Website SSL kontrolü yap
async function checkSSL(websiteId) {
  try {
    showLoading('Checking SSL...');
    
    const response = await axios.get(`/api/websites/${websiteId}/check-ssl`);
    
    if (response.data.success) {
      loadWebsites();
      showMessage('SSL check completed successfully');
    } else {
      showError(response.data.message || 'Failed to check SSL');
    }
  } catch (error) {
    console.error('Error checking SSL:', error);
    showError(error.response?.data?.message || 'Error checking SSL');
  } finally {
    hideLoading();
  }
}

// Website silme işlemi
function confirmDeleteWebsite(website) {
  if (confirm(`Şu websiteyi silmek istediğinizden emin misiniz: ${website.name}?`)) {
    deleteWebsite(website.id);
  }
}

// Website sil
async function deleteWebsite(websiteId) {
  try {
    showLoading('Deleting website...');
    
    const response = await axios.delete(`/api/websites/${websiteId}`);
    
    if (response.data.success) {
      loadWebsites();
      showMessage('Website deleted successfully');
    } else {
      showError(response.data.message || 'Failed to delete website');
    }
  } catch (error) {
    console.error('Error deleting website:', error);
    showError(error.response?.data?.message || 'Error deleting website');
  } finally {
    hideLoading();
  }
}

// Yükleme göstergesini göster
function showLoading(message = 'Loading...') {
  // Zaten bir loading elementi varsa kaldır
  hideLoading();
  
  // Yeni loading elementi oluştur
  const loadingEl = document.createElement('div');
  loadingEl.id = 'global-loading';
  loadingEl.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-message">${message}</div>
  `;
  
  // Loading elementini sayfaya ekle
  document.body.appendChild(loadingEl);
}

// Yükleme göstergesini gizle
function hideLoading() {
  const loadingEl = document.getElementById('global-loading');
  if (loadingEl) {
    loadingEl.remove();
  }
}

// Başarı mesajı göster
function showMessage(message) {
  // Toast mesajı oluştur
  const toastEl = document.createElement('div');
  toastEl.className = 'toast toast-success';
  toastEl.textContent = message;
  
  // Toast mesajını sayfaya ekle
  document.body.appendChild(toastEl);
  
  // Birkaç saniye sonra toast mesajını kaldır
  setTimeout(() => {
    toastEl.remove();
  }, 3000);
}

// Hata mesajı göster
function showError(message) {
  // Toast mesajı oluştur
  const toastEl = document.createElement('div');
  toastEl.className = 'toast toast-error';
  toastEl.textContent = message;
  
  // Toast mesajını sayfaya ekle
  document.body.appendChild(toastEl);
  
  // Birkaç saniye sonra toast mesajını kaldır
  setTimeout(() => {
    toastEl.remove();
  }, 5000);
}

// Website güncelle
async function updateWebsite() {
  try {
    const websiteForm = document.getElementById('website-form');
    const formData = new FormData(websiteForm);
    const websiteId = document.getElementById('website-id').value;
    
    const websiteData = {
      name: formData.get('name'),
      url: formData.get('url'),
      description: formData.get('description') || '',
      tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : [],
      notificationsEnabled: formData.get('notificationsEnabled') === 'on'
    };
    
    showLoading('Güncelleniyor...');
    
    const response = await axios.put(`/api/websites/${websiteId}`, websiteData);
    
    if (response.data.success) {
      closeModals();
      loadWebsites();
      showMessage('Website başarıyla güncellendi');
    } else {
      showError(response.data.message || 'Website güncellenirken hata oluştu');
    }
  } catch (error) {
    console.error('Website güncellenirken hata:', error);
    showError(error.response?.data?.message || 'Website güncellenirken hata oluştu');
  } finally {
    hideLoading();
  }
} 