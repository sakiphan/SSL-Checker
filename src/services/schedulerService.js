const cron = require('cron');
const db = require('../utils/db');
const sslCheckerService = require('./sslCheckerService');

let scheduledJob = null;

// Zamanlanmış görevi başlat
const startScheduledJob = () => {
  // Önceki zamanlanmış görevi durdur
  stopScheduledJob();
  
  // Ayarlardan cron ifadesini al
  const settings = db.get('settings').value();
  const cronExpression = settings.checkInterval || '0 0 * * *'; // Varsayılan olarak her gün gece yarısı
  
  try {
    // Yeni zamanlanmış görevi başlat
    scheduledJob = new cron.CronJob(
      cronExpression,
      async () => {
        console.log(`Zamanlanmış SSL kontrol görevi başladı: ${new Date().toISOString()}`);
        await sslCheckerService.checkAllWebsites();
      },
      null, // onComplete
      true, // start
      'Europe/Istanbul' // timezone
    );
    
    console.log(`SSL kontrol görevi zamanlandı: ${cronExpression}`);
    return {
      success: true,
      cronExpression,
      nextRun: scheduledJob.nextDates().toJSDate()
    };
  } catch (error) {
    console.error('Zamanlanmış görev başlatma hatası:', error);
    return {
      success: false,
      error: error.message || 'Zamanlanmış görev başlatılırken bir hata oluştu'
    };
  }
};

// Zamanlanmış görevi durdur
const stopScheduledJob = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('Zamanlanmış SSL kontrol görevi durduruldu');
    return true;
  }
  
  return false;
};

// Zamanlanmış görev ayarlarını güncelle
const updateSchedule = (cronExpression) => {
  // Cron ifadesini ayarlarda güncelle
  db.get('settings')
    .assign({ checkInterval: cronExpression })
    .write();
  
  // Zamanlanmış görevi yeniden başlat
  return startScheduledJob();
};

// Zamanlanmış görev bilgisini getir
const getScheduleInfo = () => {
  if (!scheduledJob) {
    return {
      active: false,
      cronExpression: db.get('settings.checkInterval').value()
    };
  }
  
  return {
    active: scheduledJob.running,
    cronExpression: db.get('settings.checkInterval').value(),
    nextRun: scheduledJob.nextDates().toJSDate()
  };
};

// Manuel olarak SSL kontrolü yap
const runCheckNow = async () => {
  console.log('Manuel SSL kontrol görevi başlatıldı');
  return await sslCheckerService.checkAllWebsites();
};

// Uygulamanın başlangıcında otomatik olarak zamanlanmış görevi başlat
startScheduledJob();

module.exports = {
  startScheduledJob,
  stopScheduledJob,
  updateSchedule,
  getScheduleInfo,
  runCheckNow
}; 