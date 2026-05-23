'use strict';
const express = require('express');
const router = express.Router();
const Notification = require('../../models/Notification');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/asyncHandler');
const { markAllRead, getUnreadCount } = require('../../services/notificationService');
router.use(authenticate);
router.get('/', asyncHandler(async (req, res) => {
  const { page=1, limit=20 } = req.query;
  const skip = (page-1)*limit;
  const [notifications, total, unread] = await Promise.all([Notification.find({ recipient:req.user._id }).sort({ createdAt:-1 }).skip(skip).limit(Number(limit)), Notification.countDocuments({ recipient:req.user._id }), getUnreadCount(req.user._id)]);
  res.json({ success:true, data:notifications, unread, pagination:{ page:Number(page), limit:Number(limit), total } });
}));
router.patch('/read-all', asyncHandler(async (req, res) => { await markAllRead(req.user._id); res.json({ success:true }); }));
router.patch('/:id/read', asyncHandler(async (req, res) => { await Notification.findOneAndUpdate({ _id:req.params.id, recipient:req.user._id }, { isRead:true, readAt:new Date() }); res.json({ success:true }); }));
module.exports = router;
