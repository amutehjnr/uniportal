'use strict';
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: String, city: String, state: String, country: String, postalCode: String,
}, { _id: false });

const educationSchema = new mongoose.Schema({
  institution: { type: String, required: true },
  degree: String,
  fieldOfStudy: String,
  startYear: Number,
  endYear: Number,
  gpa: Number,
  country: String,
  certificateUrl: String,
  transcriptUrl: String,
}, { _id: false });

const testScoreSchema = new mongoose.Schema({
  testName: { type: String, enum: ['IELTS','TOEFL','SAT','ACT','GRE','GMAT','PTE','Duolingo','Other'] },
  score: Number,
  dateGiven: Date,
  expiryDate: Date,
  certificateUrl: String,
}, { _id: false });

const workExperienceSchema = new mongoose.Schema({
  company: String, position: String, startDate: Date, endDate: Date, description: String, isCurrent: Boolean,
}, { _id: false });

const studentProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  dateOfBirth: Date,
  gender: { type: String, enum: ['male','female','non-binary','prefer_not_to_say'] },
  nationality: String,
  passportNumber: { type: String, select: false },
  passportExpiry: Date,
  address: addressSchema,
  emergencyContact: {
    name: String, relationship: String, phone: String, email: String,
  },
  education: [educationSchema],
  testScores: [testScoreSchema],
  workExperience: [workExperienceSchema],
  // Documents
  passportUrl: String,
  photoUrl: String,
  cvUrl: String,
  statementOfPurposeUrl: String,
  recommendationLetterUrls: [String],
  // Profile completion
  profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
  // Interests
  interestedPrograms: [{ type: String }],
  interestedCountries: [String],
  desiredIntake: String,
  budget: { min: Number, max: Number, currency: { type: String, default: 'USD' } },
  // Status
  applicationStatus: { type: String, enum: ['new','in_progress','applied','admitted','enrolled'], default: 'new' },
}, { timestamps: true });

studentProfileSchema.index({ nationality: 1 });
studentProfileSchema.index({ applicationStatus: 1 });

// Auto-compute profile completion
studentProfileSchema.pre('save', function(next) {
  const fields = ['dateOfBirth','gender','nationality','address','education','testScores','cvUrl','passportUrl'];
  const filled = fields.filter(f => {
    const v = this[f];
    return v && (Array.isArray(v) ? v.length > 0 : true);
  }).length;
  this.profileCompletion = Math.round((filled / fields.length) * 100);
  next();
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
