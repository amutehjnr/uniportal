'use strict';
const mongoose = require('mongoose');

const APPLICATION_STATUSES = ['draft','submitted','under_review','documents_requested','interview_scheduled','offer_extended','accepted','rejected','waitlisted','withdrawn','enrolled'];

const documentSchema = new mongoose.Schema({
  type: { type: String, enum: ['transcript','diploma','passport','photo','cv','sop','recommendation','test_score','financial','other'] },
  name: String, url: { type: String, required: true }, size: Number,
  uploadedAt: { type: Date, default: Date.now }, verifiedAt: Date,
  status: { type: String, enum: ['pending','verified','rejected'], default: 'pending' },
  rejectionReason: String,
}, { _id: false });

const timelineEventSchema = new mongoose.Schema({
  status: String, message: String, updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: { type: Date, default: Date.now },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true, index: true },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  scholarship: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship' },
  applicationNumber: { type: String, unique: true },
  status: { type: String, enum: APPLICATION_STATUSES, default: 'draft', index: true },
  intake: { type: String, enum: ['Fall','Spring','Summer','Winter'], required: true },
  intakeYear: { type: Number, required: true },
  personalStatement: { type: String, maxlength: 10000 },
  documents: [documentSchema],
  timeline: [timelineEventSchema],
  assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNotes: { type: String, select: false },
  interviewDetails: { scheduledAt: Date, type: { type: String, enum: ['in_person','video','phone'] }, link: String, notes: String },
  offerRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  paymentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  submittedAt: Date,
  reviewedAt: Date,
  closedAt: Date,
  flagged: { type: Boolean, default: false },
  flagReason: String,
  fraudScore: { type: Number, default: 0 },
}, { timestamps: true });

applicationSchema.index({ student: 1, status: 1 });
applicationSchema.index({ university: 1, status: 1 });
applicationSchema.index({ student: 1, university: 1, program: 1 }, { unique: true });
applicationSchema.index({ createdAt: -1 });

// Auto-generate application number
applicationSchema.pre('save', async function(next) {
  if (!this.applicationNumber) {
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await mongoose.model('Application').countDocuments();
    this.applicationNumber = `UP${year}${String(count + 1).padStart(6,'0')}`;
  }
  next();
});

module.exports = mongoose.model('Application', applicationSchema);
