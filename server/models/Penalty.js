const mongoose = require('mongoose');

/**
 * A penalty (fine) issued to a group member — e.g. for missing a payment deadline.
 * Group admins create penalties; members can see their own.
 */
const penaltySchema = new mongoose.Schema(
  {
    group:    { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    // The contribution cycle this penalty relates to (optional reference)
    month:    { type: Number, min: 1, max: 12, default: null },
    year:     { type: Number, min: 2020, max: 2100, default: null },

    amount:   { type: Number, required: true, min: 0 },
    reason:   { type: String, required: true, maxlength: 500 },
    status: {
      type:    String,
      enum:    ['pending', 'paid', 'waived'],
      default: 'pending',
    },
    paidAt:   { type: Date, default: null },
    waivedAt: { type: Date, default: null },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note:     { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

penaltySchema.index({ group: 1, user: 1 });
penaltySchema.index({ group: 1, status: 1 });
penaltySchema.index({ user: 1 });

module.exports = mongoose.model('Penalty', penaltySchema);
