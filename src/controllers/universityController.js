'use strict';
const University = require('../models/University');
const Program = require('../models/Program');
const Scholarship = require('../models/Scholarship');
const Application = require('../models/Application');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/asyncHandler');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');

exports.listUniversities = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, search, state, type, sort = '-createdAt' } = req.query;
  const cacheKey = `universities:${JSON.stringify(req.query)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, ...cached, fromCache: true });

  const filter = { isActive: true, isVerified: true };
  if (search) filter.$text = { $search: search };
  if (state) filter['location.state'] = state;
  if (type) filter.type = type;

  const skip = (page - 1) * limit;
  const [universities, total] = await Promise.all([
    University.find(filter).select('name slug type location ranking stats logo coverImage featured').sort(sort).skip(skip).limit(Number(limit)),
    University.countDocuments(filter),
  ]);

  const result = { data: universities, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } };
  await cacheSet(cacheKey, result, 300);
  res.json({ success: true, ...result });
});

exports.getUniversity = asyncHandler(async (req, res) => {
  const filter = req.params.slug ? { slug: req.params.slug } : { _id: req.params.id };
  const cacheKey = `university:${req.params.slug || req.params.id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const university = await University.findOne({ ...filter, isActive: true, isVerified: true });
  if (!university) throw new AppError('University not found.', 404);

  await cacheSet(cacheKey, university, 600);
  res.json({ success: true, data: university });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  const universityId = req.user.universityRef;
  if (!universityId) throw new AppError('University profile not found.', 404);

  const [applications, pendingReview, totalPrograms] = await Promise.all([
    Application.countDocuments({ university: universityId }),
    Application.countDocuments({ university: universityId, status: 'submitted' }),
    Program.countDocuments({ university: universityId }),
  ]);

  const recent = await Application.find({ university: universityId }).populate('student', 'firstName lastName email').populate('program', 'name').sort({ createdAt: -1 }).limit(10);

  res.json({ success: true, data: { stats: { applications, pendingReview, totalPrograms }, recentApplications: recent } });
});

exports.createProgram = asyncHandler(async (req, res) => {
  const program = await Program.create({ ...req.body, university: req.user.universityRef });
  await cacheDel(`university:${req.user.universityRef}`);
  res.status(201).json({ success: true, data: program });
});

exports.listPrograms = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, degree, field, minFee, maxFee, search, intake } = req.query;
  const filter = { isActive: true };
  if (req.params.universityId) filter.university = req.params.universityId;
  if (degree) filter.degree = degree;
  if (field) filter.field = { $regex: field, $options: 'i' };
  if (intake) filter.intakes = intake;
  if (search) filter.$text = { $search: search };
  if (minFee || maxFee) {
    filter['tuitionFee.amount'] = {};
    if (minFee) filter['tuitionFee.amount'].$gte = Number(minFee);
    if (maxFee) filter['tuitionFee.amount'].$lte = Number(maxFee);
  }

  const skip = (page - 1) * limit;
  const [programs, total] = await Promise.all([
    Program.find(filter).populate('university', 'name slug logo location ranking').sort({ featured: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
    Program.countDocuments(filter),
  ]);

  res.json({ success: true, data: programs, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
});
