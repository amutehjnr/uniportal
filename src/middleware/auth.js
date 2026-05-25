'use strict';
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./errorHandler');
const { asyncHandler } = require('./asyncHandler');
const logger = require('../config/logger');

// Verify JWT access token from cookie or Authorization header
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Authentication required. Please log in.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new AppError('Session expired. Please log in again.', 401);
    throw new AppError('Invalid authentication token.', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user) throw new AppError('User no longer exists.', 401);
  if (!user.isActive) throw new AppError('Your account has been deactivated.', 401);
  if (user.isSuspended) throw new AppError(`Account suspended: ${user.suspensionReason || 'Contact support.'}`, 403);

  req.user = user;
  next();
});

// Optional authentication – attaches user if token present, never blocks
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next(); // No token → just continue

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (user && user.isActive && !user.isSuspended) {
      req.user = user;
    }
  } catch {
    // Invalid/expired token → silently ignore, continue as guest
  }

  next();
};

// Role-based access control
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) throw new AppError('Authentication required.', 401);
  if (!roles.includes(req.user.role)) {
    logger.warn(`RBAC denied: ${req.user.email} (${req.user.role}) attempted to access ${req.path}`);
    throw new AppError('You do not have permission to perform this action.', 403);
  }
  next();
};

// Require email verification
const requireEmailVerified = (req, res, next) => {
  if (!req.user?.isEmailVerified) {
    throw new AppError('Please verify your email address to continue.', 403);
  }
  next();
};

// University ownership check
const requireUniversityOwner = asyncHandler(async (req, res, next) => {
  const universityId = req.params.universityId || req.body.universityId;
  if (req.user.role === 'admin' || req.user.role === 'super_admin') return next();
  if (String(req.user.universityRef) !== String(universityId)) {
    throw new AppError('You can only manage your own university.', 403);
  }
  next();
});

module.exports = { authenticate, optionalAuth, authorize, requireEmailVerified, requireUniversityOwner };
