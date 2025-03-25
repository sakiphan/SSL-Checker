const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const infoLogPath = path.join(logsDir, 'info.log');
const errorLogPath = path.join(logsDir, 'error.log');
const warnLogPath = path.join(logsDir, 'warn.log');

// Log levels
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// Format timestamp
const formatTimestamp = () => {
  return new Date().toISOString();
};

// Format log message
const formatLogMessage = (level, message, data = null) => {
  const timestamp = formatTimestamp();
  let logMessage = `[${timestamp}] ${level}: ${message}`;
  
  if (data) {
    try {
      if (typeof data === 'object') {
        logMessage += `\n${JSON.stringify(data, null, 2)}`;
      } else {
        logMessage += `\n${data}`;
      }
    } catch (error) {
      logMessage += `\nError stringifying data: ${error.message}`;
    }
  }
  
  return logMessage;
};

// Write to log file
const writeToLogFile = (filePath, message) => {
  try {
    fs.appendFileSync(filePath, message + '\n');
  } catch (error) {
    console.error(`Error writing to log file ${filePath}:`, error);
  }
};

// Log to console and file
const log = (level, message, data = null) => {
  const formattedMessage = formatLogMessage(level, message, data);
  
  // Console output
  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(formattedMessage);
      writeToLogFile(errorLogPath, formattedMessage);
      break;
    case LOG_LEVELS.WARN:
      console.warn(formattedMessage);
      writeToLogFile(warnLogPath, formattedMessage);
      break;
    case LOG_LEVELS.INFO:
    default:
      console.log(formattedMessage);
      writeToLogFile(infoLogPath, formattedMessage);
      break;
  }
};

// Log info message
const info = (message, data = null) => {
  log(LOG_LEVELS.INFO, message, data);
};

// Log warning message
const warn = (message, data = null) => {
  log(LOG_LEVELS.WARN, message, data);
};

// Log error message
const error = (message, data = null) => {
  log(LOG_LEVELS.ERROR, message, data);
};

module.exports = {
  info,
  warn,
  error
}; 