'use strict';
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const formats = {
  console: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level}]: ${message}${metaStr}`;
    })
  ),
  file: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
};

const transports = [
  new winston.transports.Console({ format: formats.console, silent: process.env.NODE_ENV === 'test' }),
  new DailyRotateFile({ filename: path.join(LOG_DIR, 'error-%DATE%.log'), datePattern: 'YYYY-MM-DD', level: 'error', maxFiles: '30d', format: formats.file }),
  new DailyRotateFile({ filename: path.join(LOG_DIR, 'combined-%DATE%.log'), datePattern: 'YYYY-MM-DD', maxFiles: '14d', format: formats.file }),
];

const logger = winston.createLogger({ level: LOG_LEVEL, transports, exitOnError: false });
logger.stream = { write: (message) => logger.http(message.trim()) };

module.exports = logger;
