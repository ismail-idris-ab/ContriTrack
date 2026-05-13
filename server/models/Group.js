const mongoose = require('mongoose');
const crypto = require('crypto');

const memberSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role:     { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: true, trim: true, maxlength: 100,
    },
    description: {
      type: String, default: '', maxlength: 500,
    },
    contributionAmount: {
      type: Number, default: 0, min: 0,
    },
    currency: {
      type: String, default: 'NGN',
    },
    inviteCode: {
      type: String, unique: true,
    },
    members: [memberSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,
    },
    isActive: {
      type: Boolean, default: true,
    },
    dueDay: {
      type: Number, default: 25, min: 1, max: 28,
    },
    graceDays: {
      type: Number, default: 3, min: 0, max: 7,
    },
    rotationType: {
      type: String,
      enum: ['fixed', 'join-order', 'random', 'bid'],
      default: 'fixed',
    },
    cyclesPerMonth: {
      type: Number, default: 1, min: 1, max: 31,
    },
    contributionFrequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    startDate: {
      type: Date, default: null,
    },
    dueDayOfWeek: {
      type: Number, min: 0, max: 6, default: null,
    },
    dueDayOfMonth: {
      type: Number, min: 1, max: 28, default: null,
    },
    dueMonth: {
      type: Number, min: 1, max: 12, default: null,
    },
  },
  { timestamps: true }
);

// Auto-generate a unique 8-char invite code before first save
groupSchema.pre('save', async function (next) {
  if (this.inviteCode) return next();
  let code;
  let exists = true;
  while (exists) {
    code = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F9C1B2"
    exists = await mongoose.model('Group').findOne({ inviteCode: code });
  }
  this.inviteCode = code;
  next();
});

groupSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Group', groupSchema);
