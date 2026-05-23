'use strict';
const express = require('express');
const router = express.Router();
const Scholarship = require('../../models/Scholarship');
const { asyncHandler } = require('../../middleware/asyncHandler');
const { AppError } = require('../../middleware/errorHandler');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', asyncHandler(async (req, res) => {
  const { page=1, limit=12, type, nationality, degree, search } = req.query;
  const filter = { isActive: true, deadline: { $gte: new Date() } };
  if (type) filter.type = type;
  if (nationality) filter['eligibility.nationalities'] = { $in: [nationality,'All'] };
  if (degree) filter['eligibility.degreeLevel'] = degree;
  if (search) filter.$text = { $search: search };
  const skip = (page-1)*limit;
  const [scholarships, total] = await Promise.all([
    Scholarship.find(filter).populate('university','name logo location').sort({ isFeatured:-1, deadline:1 }).skip(skip).limit(Number(limit)),
    Scholarship.countDocuments(filter),
  ]);
  res.json({ success:true, data:scholarships, pagination:{ page:Number(page), limit:Number(limit), total, pages:Math.ceil(total/limit) } });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const s = await Scholarship.findById(req.params.id).populate('university','name logo location contact');
  if (!s) throw new AppError('Scholarship not found.',404);
  res.json({ success:true, data:s });
}));

router.post('/', authenticate, authorize('university','admin','super_admin'), asyncHandler(async (req, res) => {
  const s = await Scholarship.create({ ...req.body, createdBy:req.user._id, university:req.body.universityId||req.user.universityRef });
  res.status(201).json({ success:true, data:s });
}));

module.exports = router;
