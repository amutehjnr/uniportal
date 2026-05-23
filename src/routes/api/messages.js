'use strict';
const express = require('express');
const router = express.Router();
const { Conversation, Message } = require('../../models/Message');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/asyncHandler');
const { AppError } = require('../../middleware/errorHandler');
const { emitToConversation } = require('../../config/socket');
router.use(authenticate);
router.get('/conversations', asyncHandler(async (req,res) => {
  const convos = await Conversation.find({ participants:req.user._id, isActive:true }).populate('participants','firstName lastName avatar role').sort({ 'lastMessage.at':-1 }).limit(50);
  res.json({ success:true, data:convos });
}));
router.post('/conversations', asyncHandler(async (req,res) => {
  const { participantId, subject, applicationId } = req.body;
  const existing = await Conversation.findOne({ participants:{ $all:[req.user._id, participantId] } });
  if (existing) return res.json({ success:true, data:existing });
  const convo = await Conversation.create({ participants:[req.user._id, participantId], subject, application:applicationId });
  res.status(201).json({ success:true, data:convo });
}));
router.get('/conversations/:id/messages', asyncHandler(async (req,res) => {
  const convo = await Conversation.findOne({ _id:req.params.id, participants:req.user._id });
  if (!convo) throw new AppError('Not found.',404);
  const msgs = await Message.find({ conversation:req.params.id, isDeleted:false }).populate('sender','firstName lastName avatar').sort({ createdAt:1 }).limit(100);
  res.json({ success:true, data:msgs });
}));
router.post('/conversations/:id/messages', asyncHandler(async (req,res) => {
  const convo = await Conversation.findOne({ _id:req.params.id, participants:req.user._id });
  if (!convo) throw new AppError('Not found.',404);
  const message = await Message.create({ conversation:req.params.id, sender:req.user._id, content:req.body.content });
  await message.populate('sender','firstName lastName avatar');
  convo.lastMessage = { content:req.body.content, sender:req.user._id, at:new Date() };
  await convo.save();
  emitToConversation(req.params.id, 'message:new', message);
  res.status(201).json({ success:true, data:message });
}));
module.exports = router;
