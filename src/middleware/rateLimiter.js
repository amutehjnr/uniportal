'use strict';
const rateLimit = require('express-rate-limit');

const createLimiter = (options) => rateLimit({
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  ...options,
});

// Auth endpoints – strict
exports.authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

// Password reset – very strict
exports.passwordResetLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 5 });

// File upload
exports.uploadLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 30 });

// API write operations
exports.writeLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 50 });

// Email verification
exports.emailLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 5 });
