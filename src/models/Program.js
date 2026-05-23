'use strict';
const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  type: { type: String, enum: ['gpa','ielts','toefl','gre','gmat','sat','act','pte','work_experience','portfolio','other'] },
  minimum: Number, preferred: Number, description: String,
}, { _id: false });

const deadlineSchema = new mongoose.Schema({
  intake: { type: String, enum: ['Fall','Spring','Summer','Winter'] },
  year: Number,
  applicationDeadline: Date,
  documentDeadline: Date,
  decisionDate: Date,
}, { _id: false });

const programSchema = new mongoose.Schema({
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: String,
  degree: { type: String, enum: ['Associate','Bachelor','Master','MBA','PhD','Certificate','Diploma','Professional'], required: true },
  field: { type: String, required: true, index: true },
  department: String,
  description: { type: String, maxlength: 5000 },
  duration: { value: Number, unit: { type: String, enum: ['months','years'], default: 'years' } },
  mode: { type: String, enum: ['on-campus','online','hybrid'], default: 'on-campus' },
  language: { type: String, default: 'English' },
  tuitionFee: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    per: { type: String, enum: ['year','semester','credit','total'], default: 'year' },
  },
  applicationFee: { amount: Number, currency: { type: String, default: 'USD' }, isWaivable: { type: Boolean, default: false } },
  requirements: [requirementSchema],
  deadlines: [deadlineSchema],
  scholarshipsAvailable: { type: Boolean, default: false },
  intakes: [{ type: String, enum: ['Fall','Spring','Summer','Winter'] }],
  capacity: Number,
  isActive: { type: Boolean, default: true, index: true },
  featured: { type: Boolean, default: false },
  tags: [String],
}, { timestamps: true });

programSchema.index({ university: 1, degree: 1, field: 1 });
programSchema.index({ name: 'text', description: 'text', field: 'text' });
programSchema.index({ 'tuitionFee.amount': 1 });

module.exports = mongoose.model('Program', programSchema);
