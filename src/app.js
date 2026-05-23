'use strict';

require('dotenv').config();
const http = require('http');
const app = require('./config/express');
const connectDB = require('./config/database');
const logger = require('./config/logger');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

async function boot() {
  try {
    await connectDB();
    logger.info('MongoDB connected');

    const server = http.createServer(app);
    initSocket(server);
    logger.info('Socket.IO initialised');

    server.listen(PORT, () => {
      logger.info(`UniPortal running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(() => process.exit(0));
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => { logger.error('Unhandled Rejection:', reason); server.close(() => process.exit(1)); });
    process.on('uncaughtException', (err) => { logger.error('Uncaught Exception:', err); server.close(() => process.exit(1)); });
  } catch (err) {
    logger.error('Boot failed:', err);
    process.exit(1);
  }
}

boot();
