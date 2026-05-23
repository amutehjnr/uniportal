'use strict';
const Application = require('../models/Application');
const Program = require('../models/Program');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');

exports.createApplication = asyncHandler(async (req, res) => {
  const { programId, intake, intakeYear, personalStatement, scholarshipId } = req.body;

  const program = await Program.findById(programId).populate('university');
  if (!program || !program.isActive) throw new AppError('Program not found or inactive.', 404);

  const existing = await Application.findOne({ student: req.user._id, university: program.university._id, program: programId });
  if (existing) throw new AppError('You have already applied to this program.', 409);

  const application = await Application.create({
    student: req.user._id,
    university: program.university._id,
    program: programId,
    scholarship: scholarshipId || undefined,
    intake, intakeYear, personalStatement,
    timeline: [{ status: 'draft', message: 'Application created', updatedBy: req.user._id }],
  });

  await createNotification({
    recipient: req.user._id,
    type: 'application_update',
    title: 'Application Created',
    body: `Your application to ${program.university.name} for ${program.name} has been saved as draft.`,
    link: `/student/applications/${application._id}`,
  });

  res.status(201).json({ success: true, data: application });
});

exports.submitApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, student: req.user._id }).populate('program university');
  if (!application) throw new AppError('Application not found.', 404);
  if (application.status !== 'draft') throw new AppError('Only draft applications can be submitted.', 400);

  // Minimum required documents check
  const requiredTypes = ['transcript','passport'];
  const uploaded = application.documents.map(d => d.type);
  const missing = requiredTypes.filter(t => !uploaded.includes(t));
  if (missing.length) throw new AppError(`Missing required documents: ${missing.join(', ')}`, 400);

  application.status = 'submitted';
  application.submittedAt = new Date();
  application.timeline.push({ status: 'submitted', message: 'Application submitted by student', updatedBy: req.user._id });
  await application.save();

  // Notify university
  await createNotification({
    recipient: application.university.user,
    type: 'application_update',
    title: 'New Application Received',
    body: `A new application has been submitted for ${application.program.name}.`,
    link: `/university/applications/${application._id}`,
  });

  res.json({ success: true, message: 'Application submitted successfully.', data: application });
});

exports.getMyApplications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (page - 1) * limit;
  const filter = { student: req.user._id };
  if (status) filter.status = status;

  const [applications, total] = await Promise.all([
    Application.find(filter).populate('university', 'name logo location').populate('program', 'name degree field').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Application.countDocuments(filter),
  ]);

  res.json({ success: true, data: applications, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
});

exports.getApplicationById = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role === 'student') filter.student = req.user._id;
  if (['university','admission_officer'].includes(req.user.role)) filter.university = req.user.universityRef;

  const application = await Application.findOne(filter)
    .populate('student', 'firstName lastName email avatar phone')
    .populate('university', 'name logo contact')
    .populate('program', 'name degree field tuitionFee')
    .populate('scholarship', 'name amount')
    .populate('assignedOfficer', 'firstName lastName email')
    .populate('offerRef');

  if (!application) throw new AppError('Application not found.', 404);
  res.json({ success: true, data: application });
});

exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, message, assignedOfficer } = req.body;
  const application = await Application.findById(req.params.id).populate('student university program');
  if (!application) throw new AppError('Application not found.', 404);

  application.status = status;
  application.timeline.push({ status, message: message || `Status updated to ${status}`, updatedBy: req.user._id });
  if (assignedOfficer) application.assignedOfficer = assignedOfficer;
  if (['rejected','accepted','enrolled'].includes(status)) application.closedAt = new Date();
  await application.save();

  await createNotification({
    recipient: application.student._id,
    type: 'application_update',
    title: 'Application Status Updated',
    body: `Your application to ${application.university.name} has been updated to: ${status.replace(/_/g,' ')}.`,
    link: `/student/applications/${application._id}`,
  });

  res.json({ success: true, data: application });
});

exports.uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded.', 400);
  const application = await Application.findOne({ _id: req.params.id, student: req.user._id });
  if (!application) throw new AppError('Application not found.', 404);
  if (['rejected','withdrawn'].includes(application.status)) throw new AppError('Cannot upload to a closed application.', 400);

  const { type } = req.body;
  // Remove existing doc of same type
  application.documents = application.documents.filter(d => d.type !== type);
  application.documents.push({ type, name: req.file.originalname, url: req.file.path, size: req.file.size });
  await application.save();

  res.json({ success: true, message: 'Document uploaded.', data: application.documents });
});
