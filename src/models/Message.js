'use strict';
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  subject: String,
  lastMessage: { content: String, sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date },
  unreadCount: { type: Map, of: Number, default: {} },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'lastMessage.at': -1 });

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 5000 },
  attachments: [{ name: String, url: String, type: String, size: Number }],
  readBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, readAt: Date }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.model('Message', messageSchema);

module.exports = { Conversation, Message };
