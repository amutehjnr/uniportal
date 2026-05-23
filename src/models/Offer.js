'use strict';
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  scholarship: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship' },
  offerNumber: { type: String, unique: true, index: true },
  type: { type: String, enum: ['conditional','unconditional'], required: true },
  conditions: [String],
  intake: { type: String, required: true },
  intakeYear: { type: Number, required: true },
  tuitionFee: { amount: Number, currency: { type: String, default: 'USD' }, per: String },
  scholarshipAmount: { amount: Number, currency: String, description: String },
  depositRequired: { amount: Number, currency: String, dueDate: Date },
  pdfUrl: String,
  status: { type: String, enum: ['pending','accepted','declined','expired','cancelled'], default: 'pending', index: true },
  acceptedAt: Date,
  declinedAt: Date,
  expiresAt: { type: Date, required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

offerSchema.index({ student: 1, status: 1 });
offerSchema.index({ expiresAt: 1 });

offerSchema.pre('save', async function(next) {
  if (!this.offerNumber) {
    const count = await mongoose.model('Offer').countDocuments();
    this.offerNumber = `OFR-${Date.now().toString(36).toUpperCase()}-${String(count + 1).padStart(4,'0')}`;
  }
  next();
});

module.exports = mongoose.model('Offer', offerSchema);
