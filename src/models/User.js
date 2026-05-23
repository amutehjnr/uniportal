'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ROLES = ['student', 'university', 'admin', 'super_admin', 'admission_officer'];

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false, minlength: 8 },
  role: { type: String, enum: ROLES, required: true, index: true },
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  avatar: { type: String, default: null },
  phone: { type: String, trim: true },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true, index: true },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: String,
  twoFactorEnabled: { type: Boolean, default: false },
  // Token management
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  refreshTokens: { type: [{ token: String, createdAt: Date, userAgent: String, ip: String }], select: false, default: [] },
  // Security
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: Date,
  lastLoginIp: String,
  // Relationships
  universityRef: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ email: 1, role: 1 });
userSchema.index({ createdAt: -1 });

// ── Pre-save: hash password ───────────────────────────────────────────────────
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Methods ───────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementLoginAttempts = async function() {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 2 * 60 * 60 * 1000; // 2h
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const update = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS) {
    update.$set = { lockUntil: Date.now() + LOCK_DURATION };
  }
  return this.updateOne(update);
};

userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  return token;
};

userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    email: this.email,
    role: this.role,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
    isEmailVerified: this.isEmailVerified,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
  };
};

module.exports = mongoose.model('User', userSchema);
