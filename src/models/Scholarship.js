'use strict';
const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema({
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', index: true },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  slug: String,
  description: { type: String, required: true, maxlength: 5000 },
  type: { type: String, enum: ['merit','need','athletic','diversity','research','government','partial','full_tuition','full_ride'], required: true },
  amount: { value: Number, currency: { type: String, default: 'USD' }, isPercentage: { type: Boolean, default: false }, percentage: Number, covers: [String] },
  eligibility: {
    nationalities: [String], gpaMinimum: Number, degreeLevel: [String],
    ageMin: Number, ageMax: Number, fieldOfStudy: [String], other: String,
  },
  deadline: { type: Date, required: true, index: true },
  startDate: Date,
  duration: { semesters: Number, renewable: Boolean, renewalCriteria: String },
  applicationRequirements: [String],
  applicationUrl: String,
  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false },
  totalSlots: Number,
  availableSlots: Number,
  tags: [String],
}, { timestamps: true });

scholarshipSchema.index({ deadline: 1, isActive: 1 });
scholarshipSchema.index({ 'eligibility.nationalities': 1 });
scholarshipSchema.index({ name: 'text', description: 'text' });
scholarshipSchema.index({ type: 1, isFeatured: 1 });

module.exports = mongoose.model('Scholarship', scholarshipSchema);
