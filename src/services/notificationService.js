'use strict';
const Notification = require('../models/Notification');
const { emitToUser } = require('../config/socket');
const { sendEmail } = require('../config/email');
const logger = require('../config/logger');

async function createNotification({ recipient, sender, type, title, body, link, metadata, channel = 'both' }) {
  const notification = await Notification.create({ recipient, sender, type, title, body, link, metadata, channel });

  // Real-time push
  try {
    emitToUser(String(recipient), 'notification:new', {
      id: notification._id, type, title, body, link, createdAt: notification.createdAt,
    });
  } catch { /* socket may not be available */ }

  // Queue email (non-blocking)
  if (channel === 'email' || channel === 'both') {
    // In production, push to a job queue. Here we fire-and-forget.
    sendEmail({ to: recipient.toString(), template: 'system', data: { title, body } }).catch(e => logger.warn('Notification email failed:', e.message));
  }

  return notification;
}

async function getUnreadCount(userId) {
  return Notification.countDocuments({ recipient: userId, isRead: false });
}

async function markAllRead(userId) {
  return Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true, readAt: new Date() });
}

module.exports = { createNotification, getUnreadCount, markAllRead };
