/**
 * Simple logger utility
 */
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../logs/error.log');

const logger = {
    info: (message) => {
        console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
    },
    warn: (message) => {
        console.warn(`[WARN] ${new Date().toISOString()}: ${message}`);
    },
    error: (message) => {
        const logEntry = `[ERROR] ${new Date().toISOString()}: ${message}\n`;
        console.error(logEntry);
        fs.appendFile(logFilePath, logEntry, (err) => {
            if (err) console.error('Failed to write to log file', err);
        });
    }
};

module.exports = logger;
