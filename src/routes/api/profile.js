'use strict';
const express = require('express');
const router = express.Router();
const StudentProfile = require('../../models/StudentProfile');
const User = require('../../models/User');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/asyncHandler');
const { AppError } = require('../../middleware/errorHandler');
const { uploadDocument, uploadAvatar } = require('../../config/cloudinary');
router.use(authenticate);
router.get('/student', asyncHandler(async (req,res) => {
  const profile = await StudentProfile.findOne({ user:req.user._id }).populate('user','firstName lastName email avatar phone');
  if (!profile) throw new AppError('Profile not found.',404);
  res.json({ success:true, data:profile });
}));
router.patch('/student', asyncHandler(async (req,res) => {
  const allowed = ['dateOfBirth','gender','nationality','address','emergencyContact','education','testScores','workExperience','interestedPrograms','interestedCountries','desiredIntake','budget'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const profile = await StudentProfile.findOneAndUpdate({ user:req.user._id }, updates, { new:true, runValidators:true });
  if (!profile) throw new AppError('Profile not found.',404);
  res.json({ success:true, data:profile });
}));
router.post('/avatar', uploadAvatar.single('avatar'), asyncHandler(async (req,res) => {
  if (!req.file) throw new AppError('No file.',400);
  await User.findByIdAndUpdate(req.user._id, { avatar:req.file.path });
  res.json({ success:true, data:{ avatar:req.file.path } });
}));
module.exports = router;
