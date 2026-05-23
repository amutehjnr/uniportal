'use strict';
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  reference: { type: String, unique: true, index: true },
  type: { type: String, enum: ['application_fee','deposit','tuition','visa','other'], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  method: { type: String, enum: ['bank_transfer','western_union','moneygram','paypal','other'], required: true },
  status: { type: String, enum: ['pending','submitted','under_review','verified','rejected','refunded'], default: 'pending', index: true },
  // Manual verification
  proofOfPayment: { url: String, uploadedAt: Date },
  senderName: String, senderBank: String, transactionId: String,
  paymentDate: Date,
  // Admin verification
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  rejectionReason: String,
  adminNotes: String,
  // Audit
  submittedAt: Date,
}, { timestamps: true });

paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

paymentSchema.pre('save', function(next) {
  if (!this.reference) {
    this.reference = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2,4).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
