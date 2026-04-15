const mongoose = require('mongoose');

const pledgeSchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    group:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },

    // The month/year the member is pledging to pay
    month:  { type: Number, required: true, min: 1, max: 12 },
    year:   { type: Number, required: true, min: 2020, max: 2100 },

    amount: { type: Number, required: true, min: 1 },
    note:   { type: String, default: '', maxlength: 500 },

    status: {
      type: String,
      enum: ['pending', 'fulfilled', 'missed'],
      default: 'pending',
    },

    // Set when the pledge is fulfilled (contribution submitted for that month)
    fulfilledAt:    { type: Date, default: null },
    contribution:   { type: mongoose.Schema.Types.ObjectId, ref: 'Contribution', default: null },

    // Optional reminder date
    remindAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One pledge per user per month/year (per group)
pledgeSchema.index({ user: 1, group: 1, month: 1, year: 1 }, { unique: true });
pledgeSchema.index({ group: 1, month: 1, year: 1 });
pledgeSchema.index({ status: 1 });
pledgeSchema.index({ user: 1 });

module.exports = mongoose.model('Pledge', pledgeSchema);
