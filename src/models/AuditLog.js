'use strict';
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  userEmail: String,
  userRole: String,
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true },
  resourceId: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  status: { type: String, enum: ['success','failure'], default: 'success' },
  errorMessage: String,
  duration: Number, // ms
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
// TTL: keep audit logs for 2 years
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
