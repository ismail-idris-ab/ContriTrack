const mongoose = require('mongoose');

/**
 * Represents one rotation slot — who receives the pot for a given month/year in a group.
 * The group admin sets the rotation order; actual payout is tracked with status + paidAt.
 */
const payoutSchema = new mongoose.Schema(
  {
    group:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group',  required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    month:     { type: Number, required: true, min: 1,    max: 12   },
    year:      { type: Number, required: true, min: 2020, max: 2100 },
    // 1-based position in the rotation (1 = first to receive)
    position:  { type: Number, required: true, min: 1 },
    // Expected amount = sum of all members' contributions that month
    expectedAmount: { type: Number, default: 0, min: 0 },
    // Actual amount confirmed as paid out
    actualAmount:   { type: Number, default: 0, min: 0 },
    status: {
      type:    String,
      enum:    ['scheduled', 'paid', 'skipped'],
      default: 'scheduled',
    },
    paidAt:    { type: Date,   default: null },
    note:      { type: String, default: '', maxlength: 500 },
    recordedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// One slot per recipient per group per month/year
payoutSchema.index({ group: 1, month: 1, year: 1, recipient: 1 }, { unique: true });
payoutSchema.index({ group: 1, year: 1 });
payoutSchema.index({ group: 1, status: 1 });

module.exports = mongoose.model('Payout', payoutSchema);
