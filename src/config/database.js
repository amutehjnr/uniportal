'use strict';
const mongoose = require('mongoose');
const logger = require('./logger');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { logger.error('MONGODB_URI not set'); process.exit(1); }

const options = { maxPoolSize: 10, minPoolSize: 2, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000, family: 4 };

let retries = 0;
const MAX_RETRIES = 5;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, options);
    retries = 0;
    mongoose.connection.on('disconnected', () => {
      if (retries < MAX_RETRIES) { retries++; setTimeout(connectDB, 5000 * retries); }
    });
    mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));
  } catch (err) {
    logger.error(`MongoDB connection failed (attempt ${retries + 1}):`, err.message);
    if (retries < MAX_RETRIES) { retries++; await new Promise(r => setTimeout(r, 5000 * retries)); return connectDB(); }
    throw err;
  }
}

module.exports = connectDB;
