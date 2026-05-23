'use strict';
const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

const audit = (action, resource) => async (req, res, next) => {
  const start = Date.now();
  const originalJson = res.json.bind(res);

  res.json = function(body) {
    const duration = Date.now() - start;
    const status = res.statusCode < 400 ? 'success' : 'failure';

    AuditLog.create({
      user: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action,
      resource,
      resourceId: req.params?.id || body?.data?._id,
      details: {
        method: req.method, url: req.originalUrl,
        body: sanitizeBody(req.body),
        statusCode: res.statusCode,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status,
      duration,
    }).catch(err => logger.warn('Audit log failed:', err.message));

    return originalJson(body);
  };

  next();
};

function sanitizeBody(body) {
  if (!body) return {};
  const sensitive = ['password', 'passwordConfirm', 'token', 'secret'];
  return Object.fromEntries(Object.entries(body).filter(([k]) => !sensitive.includes(k)));
}

module.exports = { audit };
