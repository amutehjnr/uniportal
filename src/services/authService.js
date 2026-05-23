'use strict';
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const { AppError } = require('../middleware/errorHandler');
const { sendEmail } = require('../config/email');
const logger = require('../config/logger');

function generateTokens(userId, role) {
  const payload = { id: userId, role };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

function setCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction || process.env.JWT_COOKIE_SECURE === 'true',
    sameSite: 'strict',
  };
  res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/v1/auth/refresh' });
}

function clearCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
}

async function register(data, role = 'student') {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const user = await User.create({ ...data, role });

  // Create student profile if needed
  if (role === 'student') {
    await StudentProfile.create({ user: user._id });
  }

  // Send verification email
  const verifyToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verificationUrl = `${process.env.APP_URL}/api/v1/auth/verify-email/${verifyToken}`;
  await sendEmail({ to: user.email, template: 'welcome', data: { firstName: user.firstName, verificationUrl } });

  return user;
}

async function login(email, password, req) {
  const user = await User.findOne({ email }).select('+password +refreshTokens +loginAttempts +lockUntil');
  if (!user) throw new AppError('Invalid email or password.', 401);
  if (user.isLocked()) throw new AppError('Account temporarily locked due to too many failed attempts. Try again in 2 hours.', 423);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.isActive) throw new AppError('Account has been deactivated.', 401);
  if (user.isSuspended) throw new AppError(`Account suspended: ${user.suspensionReason}`, 403);

  const { accessToken, refreshToken } = generateTokens(user._id, user.role);

  // Rotate refresh tokens (max 5 active sessions)
  user.refreshTokens = user.refreshTokens.slice(-4);
  user.refreshTokens.push({ token: crypto.createHash('sha256').update(refreshToken).digest('hex'), createdAt: new Date(), userAgent: req.get('User-Agent'), ip: req.ip });
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  user.lastLoginIp = req.ip;
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
}

async function refreshAccessToken(refreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user) throw new AppError('User not found.', 401);

  const tokenEntry = user.refreshTokens.find(t => t.token === tokenHash);
  if (!tokenEntry) throw new AppError('Refresh token revoked. Please log in again.', 401);

  // Rotate: remove old, add new
  user.refreshTokens = user.refreshTokens.filter(t => t.token !== tokenHash);
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id, user.role);
  user.refreshTokens.push({ token: crypto.createHash('sha256').update(newRefreshToken).digest('hex'), createdAt: new Date() });
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken };
}

async function logout(userId, refreshToken) {
  if (!userId || !refreshToken) return;
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await User.findByIdAndUpdate(userId, { $pull: { refreshTokens: { token: tokenHash } } });
}

async function verifyEmail(token) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) throw new AppError('Invalid or expired verification link.', 400);

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });
  return user;
}

async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user) return; // Silent – don't reveal existence

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.APP_URL}/reset-password/${resetToken}`;
  await sendEmail({ to: user.email, template: 'passwordReset', data: { firstName: user.firstName, resetUrl } });
}

async function resetPassword(token, newPassword) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires +refreshTokens');

  if (!user) throw new AppError('Invalid or expired reset link.', 400);

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // Invalidate all sessions
  await user.save();
  return user;
}

module.exports = { generateTokens, setCookies, clearCookies, register, login, refreshAccessToken, logout, verifyEmail, forgotPassword, resetPassword };
