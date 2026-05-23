'use strict';
const Redis = require('ioredis');
const logger = require('./logger');

let client = null;

function getRedisClient() {
  if (!process.env.REDIS_ENABLED || process.env.REDIS_ENABLED === 'false') return null;
  if (client) return client;

  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', (err) => logger.warn('Redis error (non-fatal):', err.message));
  return client;
}

// Cache helper – graceful degradation if Redis unavailable
async function cacheGet(key) {
  const redis = getRedisClient();
  if (!redis) return null;
  try { const val = await redis.get(key); return val ? JSON.parse(val) : null; }
  catch { return null; }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  const redis = getRedisClient();
  if (!redis) return;
  try { await redis.setex(key, ttlSeconds, JSON.stringify(value)); }
  catch { /* non-fatal */ }
}

async function cacheDel(key) {
  const redis = getRedisClient();
  if (!redis) return;
  try { await redis.del(key); }
  catch { /* non-fatal */ }
}

module.exports = { getRedisClient, cacheGet, cacheSet, cacheDel };
