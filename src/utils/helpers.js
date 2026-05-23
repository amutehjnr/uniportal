'use strict';

const crypto = require('crypto');

/** Generate a secure random token */
function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Hash a token for storage */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Slugify a string */
function slugify(str) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Strip sensitive fields from an object */
function sanitize(obj, fields = ['password', 'refreshTokens', '__v']) {
  const result = { ...obj };
  fields.forEach(f => delete result[f]);
  return result;
}

/** Format bytes to human-readable size */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/** Check if string is valid MongoDB ObjectId */
function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(String(id));
}

module.exports = { generateToken, hashToken, slugify, sanitize, formatBytes, isValidObjectId };
