'use strict';
const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true, trim: true, index: true },
  slug: { type: String, unique: true, index: true },
  description: { type: String, maxlength: 5000 },
  shortDescription: { type: String, maxlength: 500 },
  type: { type: String, enum: ['public','private','community','for_profit'], required: true },
  location: {
    address: String, city: { type: String, required: true }, state: { type: String, required: true },
    country: { type: String, default: 'USA' }, zipCode: String,
    coordinates: { lat: Number, lng: Number },
  },
  contact: { email: String, phone: String, website: String, admissionsEmail: String },
  ranking: { qs: Number, usnews: Number, times: Number, year: Number },
  stats: { totalStudents: Number, internationalStudents: Number, acceptanceRate: Number, graduationRate: Number, founded: Number },
  accreditation: [String],
  logo: String,
  coverImage: String,
  images: [String],
  featured: { type: Boolean, default: false, index: true },
  isVerified: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  verificationDocuments: [String],
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  socialLinks: { facebook: String, twitter: String, instagram: String, linkedin: String, youtube: String },
  tags: [String],
  admissionOfficers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

universitySchema.index({ name: 'text', description: 'text', tags: 'text' });
universitySchema.index({ 'location.state': 1, type: 1 });
universitySchema.index({ featured: 1, isVerified: 1, isActive: 1 });

// Auto-generate slug
universitySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

module.exports = mongoose.model('University', universitySchema);
