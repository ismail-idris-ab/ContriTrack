const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 200 },
    icon:        { type: String, default: '◎', maxlength: 10 },
    isPreset:    { type: Boolean, default: false },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    settings: {
      contributionAmount: { type: Number, default: 0, min: 0 },
      dueDay:             { type: Number, default: 25, min: 1, max: 28 },
      graceDays:          { type: Number, default: 3,  min: 0, max: 7  },
      rotationType: {
        type: String, enum: ['fixed', 'join-order', 'random', 'bid'], default: 'fixed',
      },
    },
  },
  { timestamps: true }
);

templateSchema.index({ isPreset: 1 });
templateSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Template', templateSchema);
