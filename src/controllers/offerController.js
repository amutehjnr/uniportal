'use strict';
const Offer = require('../models/Offer');
const Application = require('../models/Application');
const { generateOfferLetter } = require('../services/pdfService');
const { createNotification } = require('../services/notificationService');
const { sendEmail } = require('../config/email');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/asyncHandler');

exports.issueOffer = asyncHandler(async (req, res) => {
  const { applicationId, type, conditions, tuitionFee, scholarshipAmount, depositRequired, expiresInDays = 30 } = req.body;

  const application = await Application.findById(applicationId).populate('student university program scholarship');
  if (!application) throw new AppError('Application not found.', 404);
  if (!['under_review','interview_scheduled'].includes(application.status)) throw new AppError('Application is not in a reviewable state.', 400);

  const existing = await Offer.findOne({ application: applicationId });
  if (existing) throw new AppError('An offer already exists for this application.', 409);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const offer = await Offer.create({
    application: applicationId,
    student: application.student._id,
    university: application.university._id,
    program: application.program._id,
    scholarship: application.scholarship?._id,
    type, conditions, tuitionFee, scholarshipAmount, depositRequired,
    expiresAt,
    issuedBy: req.user._id,
  });

  // Generate PDF
  const pdfUrl = await generateOfferLetter({
    offerNumber: offer.offerNumber,
    studentName: `${application.student.firstName} ${application.student.lastName}`,
    universityName: application.university.name,
    programName: application.program.name,
    degree: application.program.degree,
    intake: application.intake,
    intakeYear: application.intakeYear,
    type,
    conditions,
    tuitionFee: tuitionFee?.amount,
    expiresAt,
  });

  offer.pdfUrl = pdfUrl;
  await offer.save();

  application.status = 'offer_extended';
  application.offerRef = offer._id;
  application.timeline.push({ status: 'offer_extended', message: 'Offer letter issued', updatedBy: req.user._id });
  await application.save();

  await createNotification({
    recipient: application.student._id,
    type: 'offer_received',
    title: '🎉 Admission Offer Received!',
    body: `Congratulations! You have received an admission offer from ${application.university.name}.`,
    link: `/student/offers/${offer._id}`,
  });

  await sendEmail({
    to: application.student.email,
    template: 'offerLetter',
    data: {
      firstName: application.student.firstName,
      universityName: application.university.name,
      programName: application.program.name,
      intake: `${application.intake} ${application.intakeYear}`,
      offerUrl: `${process.env.APP_URL}/student/offers/${offer._id}`,
    },
    attachments: [{ filename: `offer-letter-${offer.offerNumber}.pdf`, path: pdfUrl }],
  });

  res.status(201).json({ success: true, data: offer });
});

exports.respondToOffer = asyncHandler(async (req, res) => {
  const { response } = req.body; // 'accepted' | 'declined'
  if (!['accepted','declined'].includes(response)) throw new AppError('Invalid response.', 400);

  const offer = await Offer.findOne({ _id: req.params.id, student: req.user._id });
  if (!offer) throw new AppError('Offer not found.', 404);
  if (offer.status !== 'pending') throw new AppError('Offer has already been responded to.', 400);
  if (offer.expiresAt < new Date()) throw new AppError('This offer has expired.', 400);

  offer.status = response;
  offer[`${response}At`] = new Date();
  await offer.save();

  await Application.findByIdAndUpdate(offer.application, {
    status: response === 'accepted' ? 'accepted' : 'rejected',
    $push: { timeline: { status: response, message: `Student ${response} the offer`, updatedBy: req.user._id } },
  });

  res.json({ success: true, message: `Offer ${response} successfully.` });
});

exports.getOfferById = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role === 'student') filter.student = req.user._id;

  const offer = await Offer.findOne(filter)
    .populate('student', 'firstName lastName email')
    .populate('university', 'name logo')
    .populate('program', 'name degree')
    .populate('scholarship', 'name amount');

  if (!offer) throw new AppError('Offer not found.', 404);
  res.json({ success: true, data: offer });
});
