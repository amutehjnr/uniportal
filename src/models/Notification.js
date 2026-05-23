'use strict';
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['application_update','offer_received','payment_update','message_received','document_request','system','deadline_reminder','profile_incomplete'], required: true },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 1000 },
  link: String,
  metadata: mongoose.Schema.Types.Mixed,
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date,
  channel: { type: String, enum: ['in_app','email','both'], default: 'both' },
  emailSent: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL 90 days

module.exports = mongoose.model('Notification', notificationSchema);
