'use strict';
const User = require('../models/User');
const University = require('../models/University');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const Scholarship = require('../models/Scholarship');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/asyncHandler');

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalUniversities, totalApplications, pendingPayments, pendingVerifications] = await Promise.all([
    User.countDocuments({ isActive: true }),
    University.countDocuments({ isActive: true }),
    Application.countDocuments(),
    Payment.countDocuments({ status: 'submitted' }),
    University.countDocuments({ isVerified: false, isActive: true }),
  ]);

  const appsByStatus = await Application.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const recentActivity = await AuditLog.find().sort({ createdAt: -1 }).limit(20).populate('user', 'firstName lastName email role');

  res.json({ success: true, data: { totalUsers, totalUniversities, totalApplications, pendingPayments, pendingVerifications, appsByStatus, recentActivity } });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search, status } = req.query;
  const skip = (page - 1) * limit;
  const filter = {};
  if (role) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'suspended') filter.isSuspended = true;
  if (search) filter.$or = [{ email: { $regex: search, $options: 'i' } }, { firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }];

  const [users, total] = await Promise.all([
    User.find(filter).select('-password -refreshTokens').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, data: users, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
});

exports.suspendUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (req.params.id === String(req.user._id)) throw new AppError('Cannot suspend your own account.', 400);
  const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: true, suspensionReason: reason }, { new: true });
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, message: 'User suspended.', data: user.toPublicJSON() });
});

exports.verifyUniversity = asyncHandler(async (req, res) => {
  const university = await University.findByIdAndUpdate(req.params.id, { isVerified: true, verifiedAt: new Date(), verifiedBy: req.user._id }, { new: true });
  if (!university) throw new AppError('University not found.', 404);
  res.json({ success: true, message: 'University verified.', data: university });
});

exports.getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, resource, userId } = req.query;
  const skip = (page - 1) * limit;
  const filter = {};
  if (action) filter.action = action;
  if (resource) filter.resource = resource;
  if (userId) filter.user = userId;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).populate('user', 'firstName lastName email role').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: logs, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
});

exports.createAdminUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') throw new AppError('Only Super Admin can create admin users.', 403);
  const { firstName, lastName, email, password, role, universityId } = req.body;
  const allowedRoles = ['admin','admission_officer','university'];
  if (!allowedRoles.includes(role)) throw new AppError('Invalid admin role.', 400);

  const user = await require('../services/authService').register({ firstName, lastName, email, password, universityRef: universityId }, role);
  res.status(201).json({ success: true, data: user.toPublicJSON() });
});
