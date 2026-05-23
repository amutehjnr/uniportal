'use strict';
const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

exports.register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role = 'student' } = req.body;
  const allowedPublicRoles = ['student'];
  if (!allowedPublicRoles.includes(role)) throw new AppError('Invalid role.', 400);

  const user = await authService.register({ firstName, lastName, email, password }, role);
  res.status(201).json({ success: true, message: 'Account created. Please verify your email.', data: user.toPublicJSON() });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, password, req);
  authService.setCookies(res, accessToken, refreshToken);
  res.json({ success: true, message: 'Login successful.', data: { user: user.toPublicJSON(), accessToken } });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!token) throw new AppError('Refresh token required.', 401);
  const { accessToken, refreshToken } = await authService.refreshAccessToken(token);
  authService.setCookies(res, accessToken, refreshToken);
  res.json({ success: true, data: { accessToken } });
});

exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refresh_token;
  await authService.logout(req.user?._id, token);
  authService.clearCookies(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.params.token);
  res.redirect(`${process.env.APP_URL}/dashboard?verified=1`);
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await authService.resetPassword(req.params.token, req.body.password);
  res.json({ success: true, message: 'Password reset successfully. Please log in.' });
});

exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toPublicJSON() });
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await require('../models/User').findById(req.user._id).select('+password +refreshTokens');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new AppError('Current password is incorrect.', 400);
  user.password = newPassword;
  user.refreshTokens = []; // Invalidate all other sessions
  await user.save();
  authService.clearCookies(res);
  res.json({ success: true, message: 'Password updated. Please log in again.' });
});
