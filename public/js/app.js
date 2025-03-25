// Sayfa yüklendiğinde çalışacak 
document.addEventListener('DOMContentLoaded', function() {
  // Navigasyon işlevselliği
  setupNavigation();
  
  // Websiteler sayfasını yükle
  loadWebsites();
  
  // Ayarlar sayfasını yükle
  loadSettings();
  
  // Website ekleme/düzenleme modal işlevselliği
  setupWebsiteModal();
  
  // Form gönderim işlemleri
  setupFormHandlers();
});

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
          <td colspan="7" style="text-align: center;">No websites added yet</td>
        </tr>
      `;
      return;
    }
    
    let html = '';
    
    websites.forEach(website => {
      const expiryDate = website.sslExpiryDate ? new Date(website.sslExpiryDate) : null;
      const lastChecked = website.lastChecked ? new Date(website.lastChecked) : null;
      
      // Kalan gün hesaplama
      let daysRemaining = '';
      let statusClass = '';
      
      if (expiryDate) {
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        daysRemaining = diffDays.toString();
        
        if (diffDays <= 7) {
          statusClass = 'danger';
        } else if (diffDays <= 15) {
          statusClass = 'warning';
        } else {
          statusClass = 'success';
        }
      }
      
      html += `
        <tr data-id="${website.id}">
          <td>${website.name}</td>
          <td><a href="${website.url}" target="_blank">${website.url}</a></td>
          <td>${expiryDate ? expiryDate.toLocaleDateString() : '-'}</td>
          <td>${daysRemaining ? `<span class="badge ${statusClass}">${daysRemaining} days</span>` : '-'}</td>
          <td>${lastChecked ? lastChecked.toLocaleDateString() + ' ' + lastChecked.toLocaleTimeString() : '-'}</td>
          <td>${website.notificationsEnabled ? 
            '<span class="badge success">Active</span>' : 
            '<span class="badge">Disabled</span>'}</td>
          <td>
            <button class="btn check-ssl" title="Check SSL" data-id="${website.id}">🔍</button>
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

// Ayarları yükleme
async function loadSettings() {
  try {
    // Telegram ayarlarını yükle
    const settingsResponse = await axios.get('/api/settings');
    const settings = settingsResponse.data.settings;
    
    document.getElementById('bot-token').value = settings.telegramBotToken || '';
    document.getElementById('channel-id').value = settings.telegramChannelId || '';
    
    // Zamanlama ayarlarını yükle
    const scheduleResponse = await axios.get('/api/settings/schedule');
    const scheduleInfo = scheduleResponse.data.scheduleInfo;
    
    document.getElementById('cron-expression').value = scheduleInfo.cronExpression || '0 0 * * *';
    
    if (scheduleInfo.active && scheduleInfo.nextRun) {
      const nextRun = new Date(scheduleInfo.nextRun);
      document.getElementById('next-check-time').textContent = 
        nextRun.toLocaleDateString() + ' ' + nextRun.toLocaleTimeString();
    } else {
      document.getElementById('next-check-time').textContent = 'Schedule disabled';
    }
    
  } catch (error) {
    console.error('Error loading settings:', error);
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
    const notificationsEnabled = document.getElementById('notifications-enabled').checked;
    
    const websiteData = {
      name: websiteName,
      url: websiteUrl,
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
  
  // Telegram ayarları form gönderimi
  const telegramForm = document.getElementById('telegram-settings-form');
  telegramForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const botToken = document.getElementById('bot-token').value;
    const channelId = document.getElementById('channel-id').value;
    
    try {
      await axios.put('/api/settings/telegram', { botToken, channelId });
      alert('Telegram settings saved successfully.');
    } catch (error) {
      console.error('Error saving Telegram settings:', error);
      alert('An error occurred while saving Telegram settings.');
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
        alert(`Test failed: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Error during Telegram test:', error);
      alert('An error occurred during Telegram test.');
    }
  });
  
  // Zamanlama ayarları form gönderimi
  const scheduleForm = document.getElementById('schedule-settings-form');
  scheduleForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const cronExpression = document.getElementById('cron-expression').value;
    
    try {
      const response = await axios.put('/api/settings/schedule', { cronExpression });
      
      if (response.data.success) {
        const nextRun = new Date(response.data.nextRun);
        document.getElementById('next-check-time').textContent = 
          nextRun.toLocaleDateString() + ' ' + nextRun.toLocaleTimeString();
        
        alert('Schedule settings saved successfully.');
      } else {
        alert(`Could not save schedule settings: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Error saving schedule settings:', error);
      alert('An error occurred while saving schedule settings.');
    }
  });
  
  // Manuel kontrol butonu
  const runCheckNowBtn = document.getElementById('run-check-now-btn');
  runCheckNowBtn.addEventListener('click', async function() {
    try {
      this.textContent = 'Checking...';
      this.disabled = true;
      
      const response = await axios.post('/api/settings/run-check');
      
      if (response.data.success) {
        alert(`SSL check completed: ${response.data.result.success} successful, ${response.data.result.failed} failed, ${response.data.result.skipped} skipped`);
        loadWebsites(); // Websiteleri yenile
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