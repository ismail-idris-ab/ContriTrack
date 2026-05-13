const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    group:      { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    month:      { type: Number, required: true, min: 1, max: 12 },
    year:       { type: Number, required: true, min: 2020, max: 2100 },
    amount:     { type: Number, required: true, min: 1 },
    proofImage: { type: String, required: true },
    note:       { type: String, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    // Audit trail: who verified/rejected and when
    verifiedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt:    { type: Date, default: null },
    rejectionNote: { type: String, default: '', maxlength: 500 },
    rejectionHistory: [
      {
        proofImage:    { type: String, required: true },
        rejectionNote: { type: String, default: '' },
        rejectedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rejectedAt:    { type: Date },
        _id: false,
      }
    ],
    cycleNumber:   { type: Number, default: 1, min: 1 },
    isLate:         { type: Boolean, default: false },
    lateDaysOverdue:{ type: Number,  default: 0 },
    periodType:  { type: String, enum: ['weekly', 'biweekly', 'monthly', 'yearly'], default: null },
    periodStart: { type: Date, default: null },
    periodEnd:   { type: Date, default: null },
    dueDate:     { type: Date, default: null },
    periodLabel: { type: String, default: null },
  },
  { timestamps: true }
);

// Unique: one submission per user per cycle within a month (per group if set)
contributionSchema.index({ user: 1, group: 1, month: 1, year: 1, cycleNumber: 1 }, { unique: true });

// Query optimization indexes
contributionSchema.index({ month: 1, year: 1 });
contributionSchema.index({ group: 1, month: 1, year: 1 });
contributionSchema.index({ status: 1 });
contributionSchema.index({ user: 1 });
contributionSchema.index(
  { user: 1, group: 1, periodStart: 1, periodEnd: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Contribution', contributionSchema);
