'use strict';
const Payment = require('../models/Payment');
const Application = require('../models/Application');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { sendEmail } = require('../config/email');

exports.submitPayment = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Proof of payment is required.', 400);
  const { applicationId, type, amount, currency = 'USD', method, senderName, senderBank, transactionId, paymentDate } = req.body;

  const application = await Application.findOne({ _id: applicationId, student: req.user._id });
  if (!application) throw new AppError('Application not found.', 404);

  const payment = await Payment.create({
    user: req.user._id,
    application: applicationId,
    type, amount: parseFloat(amount), currency, method,
    senderName, senderBank, transactionId,
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    proofOfPayment: { url: req.file.path, uploadedAt: new Date() },
    status: 'submitted',
    submittedAt: new Date(),
  });

  application.paymentRef = payment._id;
  await application.save();

  // Notify admins
  await createNotification({
    recipient: req.user._id, // placeholder; real: notify admins
    type: 'payment_update',
    title: 'Payment Submitted',
    body: `Your payment of ${currency} ${amount} has been submitted for verification.`,
    link: `/student/payments/${payment._id}`,
  });

  res.status(201).json({ success: true, message: 'Payment submitted for verification.', data: payment });
});

exports.verifyPayment = asyncHandler(async (req, res) => {
  const { status, adminNotes, rejectionReason } = req.body;
  if (!['verified','rejected'].includes(status)) throw new AppError('Invalid status.', 400);

  const payment = await Payment.findById(req.params.id).populate('user', 'firstName lastName email');
  if (!payment) throw new AppError('Payment not found.', 404);
  if (!['submitted','under_review'].includes(payment.status)) throw new AppError('Payment cannot be updated in its current state.', 400);

  payment.status = status;
  payment.verifiedBy = req.user._id;
  payment.verifiedAt = new Date();
  if (adminNotes) payment.adminNotes = adminNotes;
  if (rejectionReason) payment.rejectionReason = rejectionReason;
  await payment.save();

  const emailTemplate = status === 'verified' ? 'paymentVerified' : 'paymentRejected';
  await sendEmail({
    to: payment.user.email,
    template: 'paymentVerified',
    data: {
      firstName: payment.user.firstName,
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.reference,
      dashboardUrl: `${process.env.APP_URL}/student/payments/${payment._id}`,
    },
  });

  res.json({ success: true, message: `Payment ${status}.`, data: payment });
});

exports.getPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;
  const filter = {};
  if (req.user.role === 'student') filter.user = req.user._id;
  if (status) filter.status = status;

  const [payments, total] = await Promise.all([
    Payment.find(filter).populate('user', 'firstName lastName email').populate('application').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Payment.countDocuments(filter),
  ]);

  res.json({ success: true, data: payments, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
});
