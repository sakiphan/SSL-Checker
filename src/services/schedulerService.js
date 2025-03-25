const cron = require('cron');
const db = require('../utils/db');
const sslCheckerService = require('./sslCheckerService');

let scheduledJob = null;

// Start scheduled job
const startScheduledJob = () => {
  // Stop previous scheduled job
  stopScheduledJob();
  
  // Get cron expression from settings
  const settings = db.get('settings').value();
  const cronExpression = settings.checkInterval || '0 0 * * *'; // Default to every day at midnight
  
  try {
    // Start new scheduled job
    scheduledJob = new cron.CronJob(
      cronExpression,
      async () => {
        console.log(`Scheduled SSL check task started: ${new Date().toISOString()}`);
        await sslCheckerService.checkAllWebsites();
      },
      null, // onComplete
      true, // start
      'Europe/Istanbul' // timezone
    );
    
    console.log(`SSL check task scheduled: ${cronExpression}`);
    return {
      success: true,
      cronExpression,
      nextRun: scheduledJob.nextDates().toJSDate()
    };
  } catch (error) {
    console.error('Scheduled task start error:', error);
    return {
      success: false,
      error: error.message || 'An error occurred while starting scheduled task'
    };
  }
};

// Stop scheduled job
const stopScheduledJob = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('Scheduled SSL check task stopped');
    return true;
  }
  
  return false;
};

// Update schedule settings
const updateSchedule = (cronExpression) => {
  // Update cron expression in settings
  db.get('settings')
    .assign({ checkInterval: cronExpression })
    .write();
  
  // Restart scheduled job
  return startScheduledJob();
};

// Get schedule information
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

// Run SSL check manually
const runCheckNow = async () => {
  console.log('Manual SSL check task started');
  return await sslCheckerService.checkAllWebsites();
};

// Start scheduled job automatically on application startup
startScheduledJob();

module.exports = {
  startScheduledJob,
  stopScheduledJob,
  updateSchedule,
  getScheduleInfo,
  runCheckNow
}; 